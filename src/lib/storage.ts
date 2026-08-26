import 'server-only';

import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { getServerEnv } from '@/lib/env';

/**
 * Cloudflare R2 (compatible con la API de S3).
 *
 * Contrato con la base de datos: Postgres guarda ÚNICAMENTE la ruta del
 * objeto (`media_key`). Nunca la URL — las URLs firmadas expiran y una URL
 * persistida se convierte en un enlace roto o en una fuga de acceso.
 *
 * El bucket es PRIVADO: nada se sirve por URL pública sin firmar. A
 * diferencia de Supabase Storage, R2 no tiene RLS propia — la autorización
 * de lectura/escritura la decide `guard()` en el Route Handler antes de
 * llegar aquí (`content:edit` para subir, `course:read` para leer), no una
 * política a nivel de objeto.
 *
 * Sólo los binarios grandes (video, imagen, audio, PDF, documentos) que
 * suben docentes y alumnos viven acá — todo lo demás (perfiles, cursos,
 * progreso, comentarios) sigue en Supabase Postgres.
 */

/**
 * Cuota gratuita de R2: 10 GB de almacenamiento. R2 no cobra egress (a
 * diferencia de S3), así que a diferencia del límite de Supabase esto sólo
 * importa para el widget de uso — no hay un límite de tamaño por archivo
 * impuesto por la plataforma como el de 50 MB del plan Free de Supabase.
 */
export const STORAGE_PLAN_LIMIT_BYTES = 10 * 1024 ** 3; // 10 GB — cuota gratuita de R2.

/** 65-89 %: la barra pasa de azul a ámbar — hay que empezar a prestar atención. */
export const STORAGE_WARNING_THRESHOLD_PERCENT = 65;
/** 90 %+: la barra pasa a rojo y es lo que dispara la alerta en Actividad reciente. */
export const STORAGE_CRITICAL_THRESHOLD_PERCENT = 90;

/** Las subidas se firman por 15 min: suficiente para un video pesado en una conexión normal. */
const UPLOAD_TTL_SECONDS = 15 * 60;
/** Duración por defecto de las URLs de reproducción/descarga: 1 h. */
const PLAYBACK_TTL_SECONDS = 60 * 60;

/** Batch máximo que acepta `DeleteObjectsCommand` por llamada. */
const DELETE_BATCH_SIZE = 1000;
const LIST_PAGE_SIZE = 1000;

let cachedClient: S3Client | null | undefined;

/** `undefined` = todavía no se resolvió; `null` = falta configuración. */
function getR2Client(): { client: S3Client; bucket: string } | null {
  if (cachedClient === undefined) {
    const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = getServerEnv();
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      cachedClient = null;
    } else {
      cachedClient = new S3Client({
        region: 'auto',
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
      });
    }
  }

  if (!cachedClient) return null;

  const { R2_BUCKET_NAME } = getServerEnv();
  if (!R2_BUCKET_NAME) return null;

  return { client: cachedClient, bucket: R2_BUCKET_NAME };
}

export interface UploadTicket {
  /** URL firmada a la que el navegador hace el PUT directo. */
  signedUrl: string;
  /** Ruta del objeto dentro del bucket — esto es lo que se guarda en Postgres. */
  mediaKey: string;
  bucket: string;
}

/**
 * Ticket de subida directa navegador → R2. El binario nunca atraviesa el
 * servidor de Next, así que no hay límite de body ni coste de ancho de
 * banda de salida.
 *
 * A diferencia de Supabase Storage (subida en dos pasos con token), una URL
 * firmada de S3/R2 para `PutObject` ya lleva la autorización embebida: el
 * cliente sólo necesita hacer un `PUT` normal contra ella.
 */
export async function createUploadTicket(params: {
  courseId: string;
  moduleId: string;
  fileName: string;
  contentType: string;
  /** Presente sólo cuando quien sube es un alumno entregando una tarea. */
  studentId?: string;
}): Promise<UploadTicket | null> {
  const r2 = getR2Client();
  if (!r2) return null;

  const mediaKey = buildMediaKey(params);
  const command = new PutObjectCommand({
    Bucket: r2.bucket,
    Key: mediaKey,
    ContentType: params.contentType,
  });
  const signedUrl = await getSignedUrl(r2.client, command, { expiresIn: UPLOAD_TTL_SECONDS });

  return { signedUrl, mediaKey, bucket: r2.bucket };
}

/** URL firmada de lectura, válida por una hora. */
export async function getPlaybackUrl(mediaKey: string): Promise<string | null> {
  if (!mediaKey) return null;

  const r2 = getR2Client();
  if (!r2) return null;

  const command = new GetObjectCommand({ Bucket: r2.bucket, Key: mediaKey });
  try {
    return await getSignedUrl(r2.client, command, { expiresIn: PLAYBACK_TTL_SECONDS });
  } catch {
    return null;
  }
}

/** Confirma que el objeto realmente existe en el bucket (no sólo que hay una fila en la BD). */
export async function mediaExists(mediaKey: string): Promise<boolean> {
  const r2 = getR2Client();
  if (!r2) return false;

  try {
    await r2.client.send(new HeadObjectCommand({ Bucket: r2.bucket, Key: mediaKey }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Ruta jerárquica y estable: permite borrar un curso entero por prefijo y
 * hace legible el bucket desde el dashboard de Cloudflare.
 *
 * Cuando `studentId` está presente (entrega de tarea), el key queda
 * namespaced bajo `entregas/{studentId}/` — dos alumnos nunca pueden
 * pisarse el mismo archivo aunque suban el mismo nombre a la vez, y el
 * prefijo permite en el futuro restringir/limpiar por dueño.
 */
function buildMediaKey({
  courseId,
  moduleId,
  fileName,
  studentId,
}: {
  courseId: string;
  moduleId: string;
  fileName: string;
  studentId?: string;
}): string {
  const safeName = normalizeFileName(fileName);
  const base = `cursos/${courseId}/modulos/${moduleId}`;
  const prefix = studentId ? `${base}/entregas/${studentId}` : base;
  return `${prefix}/${crypto.randomUUID()}-${safeName}`;
}

/**
 * Copia server-side un objeto ya existente a una clave nueva bajo otro
 * módulo — usado por "Duplicar unidad": clonar el binario de verdad (en vez
 * de apuntar dos lecciones al mismo `media_key`) es lo que evita que borrar
 * la unidad original se lleve puesto el archivo de la copia (`removeBlock`
 * borra por `media_key` sin ref-count). `CopyObjectCommand` corre entero
 * dentro de R2 — el binario nunca pasa por este servidor ni por el
 * navegador, sin importar su tamaño.
 */
export async function duplicateMediaObject(oldKey: string, newModuleId: string): Promise<string | null> {
  const r2 = getR2Client();
  if (!r2) return null;

  const segments = oldKey.split('/');
  const originalFileSegment = segments.pop();
  if (!originalFileSegment) return null;
  // El segmento final es "{uuid}-{nombre-seguro}" (ver `buildMediaKey`); se
  // conserva el nombre pero se genera un uuid nuevo para la copia.
  const fileName = originalFileSegment.replace(/^[0-9a-f-]{36}-/, '');
  segments[3] = newModuleId; // cursos/{courseId}/modulos/{moduleId}/...
  const newKey = [...segments, `${crypto.randomUUID()}-${fileName}`].join('/');

  try {
    await r2.client.send(
      new CopyObjectCommand({
        Bucket: r2.bucket,
        CopySource: `${r2.bucket}/${encodeURIComponent(oldKey)}`,
        Key: newKey,
      }),
    );
    return newKey;
  } catch (error) {
    console.error(`No se pudo duplicar el objeto "${oldKey}"`, error);
    return null;
  }
}

/** Quita acentos y caracteres no seguros para una ruta de objeto. */
function normalizeFileName(fileName: string): string {
  return fileName
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .toLowerCase();
}

export interface StorageObjectInfo {
  /** Ruta completa del objeto dentro del bucket — mismo formato que `media_key`. */
  key: string;
  size: number;
  createdAt: string;
}

/**
 * Lista TODOS los objetos reales del bucket. A diferencia de la API de
 * Supabase Storage, `ListObjectsV2` de S3/R2 ya devuelve las claves
 * recursivas de forma plana (sin "carpetas" que bajar a mano) — sólo hace
 * falta paginar con `ContinuationToken`.
 *
 * Usado por el job de reconciliación y el widget de uso de Storage: ambos
 * necesitan la lista completa de objetos reales del bucket, no lo que
 * Postgres cree que hay.
 */
export async function listAllStorageObjects(): Promise<StorageObjectInfo[]> {
  const r2 = getR2Client();
  if (!r2) return [];

  const objects: StorageObjectInfo[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await r2.client.send(
      new ListObjectsV2Command({
        Bucket: r2.bucket,
        MaxKeys: LIST_PAGE_SIZE,
        ContinuationToken: continuationToken,
      }),
    );

    for (const entry of response.Contents ?? []) {
      if (!entry.Key) continue;
      objects.push({
        key: entry.Key,
        size: entry.Size ?? 0,
        createdAt: entry.LastModified?.toISOString() ?? new Date(0).toISOString(),
      });
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return objects;
}

/** Borra objetos por clave en lotes de hasta 1000 — el máximo que acepta `DeleteObjectsCommand`. */
export async function removeStorageObjects(keys: string[]): Promise<{ removed: string[]; error: string | null }> {
  const r2 = getR2Client();
  if (!r2 || keys.length === 0) return { removed: [], error: null };

  const removed: string[] = [];
  for (let i = 0; i < keys.length; i += DELETE_BATCH_SIZE) {
    const batch = keys.slice(i, i + DELETE_BATCH_SIZE);
    try {
      const response = await r2.client.send(
        new DeleteObjectsCommand({
          Bucket: r2.bucket,
          Delete: { Objects: batch.map((key) => ({ Key: key })) },
        }),
      );
      for (const deleted of response.Deleted ?? []) {
        if (deleted.Key) removed.push(deleted.Key);
      }
      const firstError = response.Errors?.[0];
      if (firstError) return { removed, error: firstError.Message ?? 'Error al borrar objetos' };
    } catch (error) {
      return { removed, error: error instanceof Error ? error.message : 'Error al borrar objetos' };
    }
  }

  return { removed, error: null };
}
