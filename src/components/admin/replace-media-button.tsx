'use client';

import { RefreshCw } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { uploadFile, type UploadResult } from '@/features/content/upload';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface ReplaceMediaButtonProps {
  courseId: string;
  moduleId: string;
  title: string;
  onReplaced: (result: UploadResult & { fileName: string; sizeLabel: string }) => Promise<unknown>;
}

/**
 * Reemplazar el archivo de una lección sin borrarla y volver a subirla —
 * borrar+resubir pierde el `id` de la fila, y con él los comentarios y el
 * progreso de alumnos ya guardados contra ese id.
 */
export function ReplaceMediaButton({ courseId, moduleId, title, onReplaced }: ReplaceMediaButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const handleFile = async (file: File) => {
    setProgress(0);
    try {
      const result = await uploadFile({ file, courseId, moduleId, onProgress: setProgress });
      await onReplaced({ ...result, fileName: file.name, sizeLabel: formatBytes(file.size) });
      toast(`Archivo de “${title}” reemplazado`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'No se pudo reemplazar el archivo.',
      );
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button
        variant="icon"
        size="square"
        onClick={() => inputRef.current?.click()}
        disabled={progress !== null}
        aria-label={`Reemplazar archivo de “${title}”`}
        title="Reemplazar archivo (mantiene comentarios y progreso de alumnos)"
        className="hover:border-brand hover:text-brand disabled:opacity-40"
      >
        <RefreshCw
          aria-hidden
          size={13}
          strokeWidth={2.4}
          className={cn(progress !== null && 'animate-spin')}
        />
      </Button>
    </>
  );
}
