'use client';

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Progress } from '@/components/ui/progress';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';
import { uploadFile, type UploadResult } from '@/features/content/upload';

/**
 * El servidor (`/api/uploads`) acepta cualquier `video/*`, `audio/*` o
 * `image/*`, así que esta lista es sólo el filtro del selector nativo — pero
 * si le faltan los formatos que un celular genera por defecto (`.mov` de la
 * cámara del iPhone, `.m4a` de Voice Memos, `.heic`/`.heif` de Fotos), el
 * selector los oculta antes de que el usuario llegue a elegirlos.
 */
const ACCEPTED = '.mp4,.mov,.mp3,.m4a,.pdf,.docx,.png,.jpg,.jpeg,.webp,.heic,.heif';
/**
 * 5 GB: el techo real de un `PutObject` sin multipart contra S3/R2 (por
 * encima de eso, R2 exige subida multiparte — no implementada). Antes el
 * límite era 2 GB por una elección arbitraria, no por esta restricción real;
 * un video largo en buena calidad ya la superaba.
 */
const MAX_BYTES = 5 * 1024 * 1024 * 1024;

/**
 * Comprimir video de verdad requiere transcodificar (ffmpeg o un servicio
 * dedicado como Cloudflare Stream) — no algo que se pueda hacer bien en el
 * navegador para un archivo de varios GB sin arriesgar que el tab se
 * cuelgue. En vez de fingir una compresión que no existe, se avisa cuando
 * el video es grande y se sugiere comprimirlo antes con una herramienta
 * externa (HandBrake es gratis) — más rápido de subir y consume menos de
 * la cuota de 10 GB de R2.
 */
const LARGE_VIDEO_WARNING_BYTES = 500 * 1024 * 1024; // 500 MB

export interface UploadDropzoneProps {
  courseId: string;
  moduleId: string;
  /** Se llama cuando el archivo terminó de subirse, para registrarlo en la BD. */
  onUploaded: (result: UploadResult & { fileName: string; sizeLabel: string }) => Promise<void> | void;
  className?: string;
}

/**
 * Zona de subida a Supabase Storage.
 *
 * El binario va del navegador directamente al bucket con una URL firmada: no
 * atraviesa el servidor de Next, así que no hay límite de body ni coste de
 * ancho de banda de salida. Postgres sólo recibe después la ruta del objeto
 * (vía `onUploaded`, que crea el bloque de contenido).
 *
 * Es a la vez zona de arrastre y botón: el drag-and-drop no es accesible por
 * teclado, así que el elemento es un `<button>` que abre el selector nativo.
 */
interface QueueState {
  index: number;
  total: number;
  fileName: string;
  percent: number;
}

export function UploadDropzone({ courseId, moduleId, onUploaded, className }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState<QueueState | null>(null);

  /**
   * Antes sólo se tomaba `files[0]`: subir un curso entero con muchos videos
   * obligaba a repetir el diálogo de archivo uno por uno. Ahora se sube toda
   * la selección/arrastre en cola, secuencial — no en paralelo, porque cada
   * subida termina en un `attachUpload` que calcula la siguiente posición
   * del bloque a partir del máximo actual (`nextBlockPosition`); dos
   * `attachUpload` concurrentes podrían leer la misma posición "siguiente"
   * antes de que la primera se confirme.
   */
  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const list = Array.from(files ?? []);
      if (list.length === 0) return;

      const tooLarge = list.filter((f) => f.size > MAX_BYTES);
      const toUpload = list.filter((f) => f.size <= MAX_BYTES);
      if (tooLarge.length > 0) {
        toast.error(
          tooLarge.length === 1
            ? `“${tooLarge[0]!.name}” supera los 5 GB permitidos por archivo`
            : `${tooLarge.length} archivos superan los 5 GB permitidos por archivo`,
        );
      }

      const largeVideos = toUpload.filter(
        (f) => f.type.startsWith('video/') && f.size > LARGE_VIDEO_WARNING_BYTES,
      );
      if (largeVideos.length > 0) {
        toast(
          largeVideos.length === 1
            ? `“${largeVideos[0]!.name}” pesa ${formatBytes(largeVideos[0]!.size)} — comprimirlo antes (p. ej. con HandBrake, gratis) sube más rápido y gasta menos cuota`
            : `${largeVideos.length} videos pesan varios cientos de MB — comprimirlos antes (p. ej. con HandBrake, gratis) sube más rápido y gasta menos cuota`,
          { duration: 8000 },
        );
      }

      const failed: string[] = [];
      const succeeded: string[] = [];

      for (const [i, file] of toUpload.entries()) {
        setQueue({ index: i, total: toUpload.length, fileName: file.name, percent: 0 });
        try {
          const result = await uploadFile({
            file,
            courseId,
            moduleId,
            onProgress: (percent) => setQueue({ index: i, total: toUpload.length, fileName: file.name, percent }),
          });
          await onUploaded({ ...result, fileName: file.name, sizeLabel: formatBytes(file.size) });
          succeeded.push(file.name);
        } catch (error) {
          failed.push(file.name);
          console.error(`No se pudo subir "${file.name}"`, error);
        }
      }

      setQueue(null);
      if (inputRef.current) inputRef.current.value = '';

      if (succeeded.length > 0) {
        toast(
          succeeded.length === 1
            ? `“${succeeded[0]}” subido a la unidad`
            : `${succeeded.length} archivos subidos a la unidad`,
        );
      }
      if (failed.length > 0) {
        toast.error(
          failed.length === 1
            ? `“${failed[0]}” falló al subir. Revisa tu conexión e inténtalo de nuevo.`
            : `${failed.length} archivos fallaron al subir: ${failed.join(', ')}`,
        );
      }
    },
    [courseId, moduleId, onUploaded],
  );

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="sr-only"
        onChange={(event) => void handleFiles(event.target.files)}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          'w-full cursor-pointer rounded-6xl border-[1.5px] border-dashed p-4 sm:p-[22px] text-center',
          'transition-[background-color,border-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
          dragging
            ? 'border-brand bg-brand-soft'
            : 'border-line-dashed bg-surface-subtle hover:border-fg-placeholder',
        )}
      >
        <span className="block text-body-sm font-bold text-fg-subtle">
          {queue === null
            ? 'Suelta o toca aquí para subir archivos a la unidad'
            : `Subiendo ${queue.index + 1}/${queue.total} · “${queue.fileName}” — ${Math.round(queue.percent)} %`}
        </span>
        <span className="mt-[3px] block text-tiny font-semibold text-fg-disabled">
          MP4, MP3, PDF, DOCX o imágenes · hasta 5 GB por archivo
        </span>
      </button>

      {queue !== null && (
        <Progress
          value={(queue.index / queue.total) * 100 + queue.percent / queue.total}
          tone="accent"
          height={5}
          className="mt-2.5"
          label={`Progreso de la subida (${queue.index + 1} de ${queue.total})`}
        />
      )}
    </div>
  );
}
