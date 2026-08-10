import { IS_DEMO_MODE } from '@/lib/env';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export interface UploadParams {
  file: File;
  courseId: string;
  moduleId: string;
  onProgress: (percent: number) => void;
}

export interface UploadResult {
  mediaKey: string;
  contentType: string;
}

/**
 * Subida directa navegador → Supabase Storage en dos pasos:
 *
 *  1. El servidor firma una URL de subida (nunca se expone la service role
 *     key al cliente) vía `POST /api/uploads`.
 *  2. El navegador sube el binario contra esa URL con el propio cliente de
 *     Supabase, que ya lleva adjuntos los encabezados de autenticación.
 *
 * `uploadToSignedUrl` usa `fetch` internamente y no expone progreso byte a
 * byte (a diferencia de un XHR crudo contra S3): se reporta inicio y fin,
 * no un porcentaje granular inventado.
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

  const { token, mediaKey, bucket } = (await ticketResponse.json()) as {
    token: string;
    mediaKey: string;
    bucket: string;
  };

  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error('Supabase no está configurado en el navegador');

  onProgress(50);
  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(mediaKey, token, file, { contentType: file.type });

  if (error) throw new Error(error.message);
  onProgress(100);

  return { mediaKey, contentType: file.type };
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

  onProgress(30);
  const response = await fetch('/api/demo-uploads', { method: 'POST', body: formData });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? 'No se pudo subir el archivo');
  }
  onProgress(100);

  return { mediaKey, contentType: file.type };
}
