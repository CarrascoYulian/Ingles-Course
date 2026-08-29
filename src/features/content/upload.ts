import { IS_DEMO_MODE } from '@/lib/env';

export interface UploadParams {
  file: File;
  courseId: string;
  moduleId: string;
  onProgress: (percent: number) => void;
}

export interface UploadResult {
  mediaKey: string;
  contentType: string;
  /** Sólo para video: duración real leída del archivo antes de subirlo. */
  durationSeconds?: number;
}

/**
 * Algunos selectores de archivo móviles (gestores de archivos de Android,
 * ciertas apps de terceros) entregan `file.type` vacío en vez del MIME real
 * — el navegador de escritorio casi siempre lo completa, por eso esto no se
 * nota probando sólo en PC. El servidor rechaza `contentType` vacío antes de
 * siquiera mirar la lista blanca (`z.string().min(1)`), así que sin este
 * fallback por extensión la subida fallaba con un error genérico.
 */
const EXTENSION_FALLBACK: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

function resolveContentType(file: File): string {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  return (extension && EXTENSION_FALLBACK[extension]) || 'application/octet-stream';
}

/**
 * Lee la duración real de un video desde el propio archivo, sin subirlo
 * todavía. Antes las lecciones nunca guardaban duración real (quedaba en
 * 0), así que el reproductor caía siempre al valor de referencia "08:24".
 */
function probeVideoDuration(file: File): Promise<number | undefined> {
  if (!file.type.startsWith('video/')) return Promise.resolve(undefined);

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      cleanup();
      resolve(Number.isFinite(video.duration) ? video.duration : undefined);
    };
    video.onerror = () => {
      cleanup();
      resolve(undefined);
    };
    video.src = url;
  });
}

/**
 * Transferencia con progreso real byte a byte, vía `XMLHttpRequest` — a
 * diferencia de `fetch`, sí expone `upload.onprogress`. Antes se reportaba
 * un salto artificial 0 → 50 % (ticket firmado) → 100 % (subida completa):
 * en un video pesado, la barra se quedaba clavada en 50 % durante todo el
 * tiempo real de transferencia, que es la parte lenta, y eso se leía como
 * que la subida estaba trabada.
 */
function xhrTransfer(
  method: 'PUT' | 'POST',
  url: string,
  body: XMLHttpRequestBodyInit,
  headers: Record<string, string> | undefined,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [key, value] of Object.entries(headers ?? {})) xhr.setRequestHeader(key, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`La subida terminó con error ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Se perdió la conexión durante la subida'));
    xhr.ontimeout = () => reject(new Error('La subida tardó demasiado y se cortó'));
    xhr.send(body);
  });
}

const RETRY_DELAYS_MS = [1000, 4000];

/**
 * Reintenta sólo la transferencia del binario (no el ticket ni el sondeo de
 * duración) — es la parte que de verdad falla en una conexión inestable
 * cuando el archivo pesa varios GB y tarda minutos. La URL firmada sigue
 * viva 15 min (`UPLOAD_TTL_SECONDS`), tiempo de sobra para 1-2 reintentos.
 */
async function xhrTransferWithRetry(
  method: 'PUT' | 'POST',
  url: string,
  body: XMLHttpRequestBodyInit,
  headers: Record<string, string> | undefined,
  onProgress: (percent: number) => void,
): Promise<void> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await xhrTransfer(method, url, body, headers, onProgress);
      return;
    } catch (error) {
      if (attempt >= RETRY_DELAYS_MS.length) throw error;
      onProgress(0);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
}

/**
 * Subida directa navegador → Cloudflare R2 en dos pasos:
 *
 *  1. El servidor firma una URL de subida (nunca se expone la access key
 *     secreta al cliente) vía `POST /api/uploads`.
 *  2. El navegador hace un `PUT` normal contra esa URL — una URL firmada de
 *     S3/R2 ya lleva la autorización embebida, a diferencia del esquema de
 *     dos partes (URL + token) de Supabase Storage.
 */
export async function uploadFile({
  file,
  courseId,
  moduleId,
  onProgress,
}: UploadParams): Promise<UploadResult> {
  const contentType = resolveContentType(file);
  const bodyFile = file.type ? file : new File([file], file.name, { type: contentType });

  if (IS_DEMO_MODE) return uploadDemoFile(bodyFile, moduleId, onProgress);

  const ticketResponse = await fetch('/api/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId, moduleId, fileName: file.name, contentType }),
  });

  if (!ticketResponse.ok) {
    const body = (await ticketResponse.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? 'No se pudo preparar la subida');
  }

  const { signedUrl, mediaKey } = (await ticketResponse.json()) as {
    signedUrl: string;
    mediaKey: string;
    bucket: string;
  };

  const durationSeconds = await probeVideoDuration(file);

  await xhrTransferWithRetry('PUT', signedUrl, bodyFile, { 'Content-Type': contentType }, onProgress);

  return { mediaKey, contentType, durationSeconds };
}

/**
 * Modo demo: escribe el archivo de verdad en `public/demo-uploads/` (ver
 * `/api/demo-uploads`), para que exista un binario real que verificar —
 * antes esto sólo simulaba una barra de progreso sin guardar nada.
 */
async function uploadDemoFile(
  file: File,
  moduleId: string,
  onProgress: (percent: number) => void,
): Promise<UploadResult> {
  const safeName = file.name.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
  const mediaKey = `cursos/demo/modulos/${moduleId}/${crypto.randomUUID()}-${safeName}`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('mediaKey', mediaKey);

  const durationSeconds = await probeVideoDuration(file);

  await xhrTransferWithRetry('POST', '/api/demo-uploads', formData, undefined, onProgress);

  return { mediaKey, contentType: resolveContentType(file), durationSeconds };
}
