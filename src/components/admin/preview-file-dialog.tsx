'use client';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

export interface PreviewFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Nombre real del archivo (con extensión) — decide cómo previsualizarlo. */
  fileName: string;
  url: string | null;
  loading?: boolean;
}

const OFFICE_EXTENSIONS = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov'];

function extensionOf(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

type PreviewKind = 'pdf' | 'office' | 'image' | 'audio' | 'video' | 'unsupported';

function kindOf(fileName: string): PreviewKind {
  const ext = extensionOf(fileName);
  if (ext === 'pdf') return 'pdf';
  if (OFFICE_EXTENSIONS.includes(ext)) return 'office';
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  return 'unsupported';
}

/**
 * Antes esto sólo sabía dibujar PDF/video/audio con el `<iframe>`/`<video>`
 * directo — para un .docx eso simplemente no funciona (ningún navegador
 * sabe renderizar Word de forma nativa, así que el `<iframe>` terminaba
 * disparando la descarga en vez de mostrar nada). Word/Excel/PowerPoint
 * pasan por el visor público de Office, que sí sabe leer esos formatos a
 * partir de una URL — la nuestra ya es pública mientras dure la firma.
 */
export function PreviewFileDialog({ open, onOpenChange, title, fileName, url, loading }: PreviewFileDialogProps) {
  const kind = kindOf(fileName);
  const wide = kind === 'pdf' || kind === 'office';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={wide ? 720 : 560}>
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

          {!loading && url && kind === 'video' && (
            <video src={url} controls className="w-full rounded-2xl bg-black" />
          )}

          {!loading && url && kind === 'audio' && <audio src={url} controls className="w-full" />}

          {!loading && url && kind === 'pdf' && (
            <iframe src={url} title={title} className="h-[70vh] w-full rounded-2xl border border-line" />
          )}

          {!loading && url && kind === 'image' && (
            // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal, no apta para el optimizador de imágenes de Next
            <img src={url} alt={title} className="max-h-[70vh] w-full rounded-2xl object-contain" />
          )}

          {!loading && url && kind === 'office' && (
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
              title={title}
              className="h-[70vh] w-full rounded-2xl border border-line"
            />
          )}

          {!loading && url && kind === 'unsupported' && (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-sunken px-4 py-8 text-center">
              <p className="text-body-sm font-semibold text-fg-faint">
                Este tipo de archivo no tiene vista previa — descárgalo para verlo.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-body-sm font-bold text-brand hover:underline"
              >
                Descargar {fileName}
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
