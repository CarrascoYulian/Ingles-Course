'use client';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { BlockType } from '@/types';

export interface PreviewFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  type: BlockType;
  url: string | null;
  loading?: boolean;
}

/**
 * Antes verificar un archivo subido significaba abrirlo en otra pestaña y
 * perder el lugar donde estabas en el constructor de contenido. Esto
 * muestra el PDF/video/audio real tal cual lo verá el alumno, sin salir de
 * la pantalla — para poder revisar rápido el orden de lo que ya se subió.
 */
export function PreviewFileDialog({ open, onOpenChange, title, type, url, loading }: PreviewFileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={type === 'PDF' ? 720 : 560}>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Así se ve el archivo que subiste.</DialogDescription>

        <div className="mt-4">
          {loading && (
            <div className="flex h-[240px] items-center justify-center rounded-2xl bg-surface-sunken">
              <p className="text-body-sm font-semibold text-fg-faint">Cargando vista previa…</p>
            </div>
          )}

          {!loading && !url && (
            <div className="flex h-[240px] items-center justify-center rounded-2xl bg-surface-sunken">
              <p className="text-body-sm font-semibold text-fg-faint">
                El archivo no existe o ya no está disponible.
              </p>
            </div>
          )}

          {!loading && url && type === 'Video' && (
            <video src={url} controls className="w-full rounded-2xl bg-black" />
          )}

          {!loading && url && type === 'Audio' && (
            <audio src={url} controls className="w-full" />
          )}

          {!loading && url && type === 'PDF' && (
            <iframe src={url} title={title} className="h-[70vh] w-full rounded-2xl border border-line" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
