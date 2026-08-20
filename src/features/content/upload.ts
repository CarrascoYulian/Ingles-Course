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
 * Subida directa navegador → Cloudflare R2 en dos pasos:
 *
 *  1. El servidor firma una URL de subida (nunca se expone la access key
 *     secreta al cliente) vía `POST /api/uploads`.
 *  2. El navegador hace un `PUT` normal contra esa URL — una URL firmada de
 *     S3/R2 ya lleva la autorización embebida, a diferencia del esquema de
 *     dos partes (URL + token) de Supabase Storage.
 *
 * Un `fetch` con `PUT` no expone progreso byte a byte (a diferencia de un
 * XHR crudo): se reporta inicio y fin, no un porcentaje granular inventado.
 */
export async function uploadFile({
  file,
  courseId,
  moduleId,
  onProgress,
}: UploadParams): Promise<UploadResult> {
  if (IS_DEMO_MODE) return uploadDemoFile(file, moduleId, onProgress);

  const ticketResponse = await fetch('/api/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId, moduleId, fileName: file.name, contentType: file.type }),
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

  onProgress(50);
  const uploadResponse = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!uploadResponse.ok) throw new Error('No se pudo subir el archivo');
  onProgress(100);

  return { mediaKey, contentType: file.type, durationSeconds };
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

  onProgress(30);
  const response = await fetch('/api/demo-uploads', { method: 'POST', body: formData });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? 'No se pudo subir el archivo');
  }
  onProgress(100);

  return { mediaKey, contentType: file.type, durationSeconds };
}
