import 'server-only';

import { getSupabaseAdminClient, getSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Supabase Storage.
 *
 * Contrato con la base de datos: Postgres guarda ÚNICAMENTE la ruta del
 * objeto (`media_key`). Nunca la URL — las URLs firmadas caducan y una URL
 * persistida se convierte en un enlace roto o en una fuga de acceso.
 *
 * El bucket es PRIVADO (`course-files`, creado en
 * supabase/migrations/0003_storage.sql): nada se sirve por URL pública sin
 * firmar. Las políticas RLS de `storage.objects` (misma migración) sólo
 * dejan escribir a `admin`/`instructor`; leer está abierto a cualquier
 * usuario autenticado, igual que el resto del contenido publicado.
 */

export const STORAGE_BUCKET = 'course-files';

/**
 * Límite del plan contratado en Supabase, en bytes. La API de Supabase no
 * expone la cuota del plan — hay que fijarla a mano y ajustarla si cambia
 * el plan (panel de Supabase → Settings → Billing).
 *
 * El proyecto real está en el plan **Free**: la cuota de Storage es 1 GB,
 * no los 200 GB del mock original del diseño (verificado contra
 * https://supabase.com/docs/guides/platform/manage-your-usage/storage-size).
 * Subir a Pro cambia esto a 100 GB — actualizar este valor si eso pasa.
 */
export const STORAGE_PLAN_LIMIT_BYTES = 1 * 1024 ** 3; // 1 GB — cuota real del plan Free.

/** A partir de este porcentaje se dispara la alerta de cuota (issue #39). */
export const STORAGE_ALERT_THRESHOLD_PERCENT = 80;

/** Las subidas se firman por 15 min: suficiente para 2 GB en una conexión normal. */
const UPLOAD_TTL_SECONDS = 15 * 60;
/** Duración por defecto de las URLs de reproducción/descarga: 1 h. */
const PLAYBACK_TTL_SECONDS = 60 * 60;

export interface UploadTicket {
  /** URL firmada a la que el navegador hace el PUT/POST directo. */
  signedUrl: string;
  /** Token que exige `uploadToSignedUrl` en el cliente, junto con la URL. */
  token: string;
  /** Ruta del objeto dentro del bucket — esto es lo que se guarda en Postgres. */
  mediaKey: string;
  bucket: string;
}

/**
 * Ticket de subida directa navegador → Supabase Storage. El binario nunca
 * atraviesa el servidor de Next, así que no hay límite de body ni coste de
 * ancho de banda de salida.
 *
 * Se firma con el cliente de service role porque generar la URL de subida
 * requiere permisos que la política RLS del usuario normal no necesita
 * tener: el usuario ya fue autorizado por `guard('content:edit')` antes de
 * llegar aquí, en el Route Handler.
 */
export async function createUploadTicket(params: {
  courseId: string;
  moduleId: string;
  fileName: string;
}): Promise<UploadTicket | null> {
  const admin = getSupabaseAdminClient();
  if (!admin) return null;

  const mediaKey = buildMediaKey(params);
  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(mediaKey);

  if (error || !data) return null;

  return { signedUrl: data.signedUrl, token: data.token, mediaKey, bucket: STORAGE_BUCKET };
}

/**
 * URL firmada de lectura. Se genera con el cliente del usuario (no el de
 * service role): así RLS decide si puede leer ese objeto, en vez de que el
 * servidor firme ciegamente cualquier ruta que le pidan.
 */
export async function getPlaybackUrl(mediaKey: string): Promise<string | null> {
  if (!mediaKey) return null;

  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(mediaKey, PLAYBACK_TTL_SECONDS);

  if (error || !data) return null;
  return data.signedUrl;
}

/** Confirma que el objeto realmente existe en el bucket (no sólo que hay una fila en la BD). */
export async function mediaExists(mediaKey: string): Promise<boolean> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return false;

  const segments = mediaKey.split('/');
  const fileName = segments.pop();
  const folder = segments.join('/');
  if (!fileName) return false;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(folder, { search: fileName, limit: 1 });

  if (error) return false;
  return (data ?? []).some((entry) => entry.name === fileName);
}

/**
 * Ruta jerárquica y estable: permite borrar un curso entero por prefijo y
 * hace legible el bucket desde el panel de Supabase.
 */
function buildMediaKey({
  courseId,
  moduleId,
  fileName,
}: {
  courseId: string;
  moduleId: string;
  fileName: string;
}): string {
  const safeName = normalizeFileName(fileName);
  return `cursos/${courseId}/modulos/${moduleId}/${crypto.randomUUID()}-${safeName}`;
}

/** Quita acentos y caracteres no seguros para una ruta de objeto. */
function normalizeFileName(fileName: string): string {
  return fileName
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .toLowerCase();
}

export { UPLOAD_TTL_SECONDS };

export interface StorageObjectInfo {
  /** Ruta completa del objeto dentro del bucket — mismo formato que `media_key`. */
  key: string;
  size: number;
  createdAt: string;
}

const LIST_PAGE_SIZE = 1000;

/**
 * Recorre el bucket recursivamente y devuelve TODOS los objetos reales
 * (nunca "carpetas"). `storage.list()` de Supabase sólo lista un nivel a la
 * vez — igual que un `ls` sin `-R` — así que hay que bajar manualmente por
 * la jerarquía `cursos/<id>/modulos/<id>/<archivo>` que arma `buildMediaKey`.
 *
 * Usado por el job de reconciliación (Fase 2) y el widget de uso de Storage
 * (Fase 3): ambos necesitan la lista completa de objetos reales del bucket,
 * no lo que Postgres cree que hay.
 */
export async function listAllStorageObjects(): Promise<StorageObjectInfo[]> {
  const admin = getSupabaseAdminClient();
  if (!admin) return [];

  const objects: StorageObjectInfo[] = [];

  async function walk(prefix: string): Promise<void> {
    let offset = 0;
    for (;;) {
      const { data, error } = await admin!.storage
        .from(STORAGE_BUCKET)
        .list(prefix, { limit: LIST_PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' } });
      if (error || !data) return;

      for (const entry of data) {
        const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
        // Supabase Storage no tiene carpetas reales: `id === null` es la
        // convención con la que el cliente marca un prefijo agrupador.
        if (entry.id === null) {
          await walk(fullPath);
        } else {
          objects.push({
            key: fullPath,
            size: entry.metadata?.size ?? 0,
            createdAt: entry.created_at ?? new Date(0).toISOString(),
          });
        }
      }

      if (data.length < LIST_PAGE_SIZE) return;
      offset += LIST_PAGE_SIZE;
    }
  }

  await walk('');
  return objects;
}

/** Borra objetos por clave en lotes — la API de Storage acepta un array por llamada. */
export async function removeStorageObjects(keys: string[]): Promise<{ removed: string[]; error: string | null }> {
  const admin = getSupabaseAdminClient();
  if (!admin || keys.length === 0) return { removed: [], error: null };

  const { data, error } = await admin.storage.from(STORAGE_BUCKET).remove(keys);
  if (error) return { removed: [], error: error.message };
  return { removed: (data ?? []).map((entry) => entry.name), error: null };
}
