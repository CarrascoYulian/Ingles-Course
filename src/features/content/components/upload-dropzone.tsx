'use client';

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Progress } from '@/components/ui/progress';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';
import { uploadFile, type UploadResult } from '@/features/content/upload';

const ACCEPTED = '.mp4,.mp3,.pdf,.docx,.png,.jpg,.jpeg,.webp';
const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

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
export function UploadDropzone({ courseId, moduleId, onUploaded, className }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;

      if (file.size > MAX_BYTES) {
        toast.error('El archivo supera los 2 GB permitidos');
        return;
      }

      setProgress(0);
      try {
        const result = await uploadFile({ file, courseId, moduleId, onProgress: setProgress });
        await onUploaded({ ...result, fileName: file.name, sizeLabel: formatBytes(file.size) });
        toast(`“${file.name}” subido a la unidad`);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Falló la subida. Revisa tu conexión e inténtalo de nuevo.',
        );
      } finally {
        setProgress(null);
        if (inputRef.current) inputRef.current.value = '';
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
          'w-full cursor-pointer rounded-6xl border-[1.5px] border-dashed p-[22px] text-center',
          'transition-[background-color,border-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
          dragging
            ? 'border-brand bg-brand-soft'
            : 'border-line-dashed bg-surface-subtle hover:border-fg-placeholder',
        )}
      >
        <span className="block text-body-sm font-bold text-fg-subtle">
          {progress === null
            ? 'Suelta aquí un archivo para añadirlo a la unidad'
            : `Subiendo… ${Math.round(progress)} %`}
        </span>
        <span className="mt-[3px] block text-tiny font-semibold text-fg-disabled">
          MP4, MP3, PDF, DOCX o imágenes · hasta 2 GB
        </span>
      </button>

      {progress !== null && (
        <Progress
          value={progress}
          tone="accent"
          height={5}
          className="mt-2.5"
          label="Progreso de la subida"
        />
      )}
    </div>
  );
}
