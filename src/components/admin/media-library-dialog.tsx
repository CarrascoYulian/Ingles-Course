'use client';

import { ClipboardCheck, FileAudio, FileText, ListChecks, Video as VideoIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { BLOCK_BADGE } from '@/constants/palettes';
import { cn } from '@/lib/utils';
import type { BlockType, MediaLibraryItem } from '@/types';

export interface MediaLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: MediaLibraryItem[] | undefined;
  loading?: boolean;
  onUse: (item: MediaLibraryItem) => void;
  usePending?: boolean;
}

const TYPE_ICON: Record<BlockType, typeof VideoIcon> = {
  Video: VideoIcon,
  PDF: FileText,
  Audio: FileAudio,
  Ejercicio: ListChecks,
  Evaluación: ClipboardCheck,
};

/**
 * "Reutilizar de la biblioteca": elegir un archivo ya subido a otra unidad
 * del curso en vez de volver a subirlo — clona el binario en R2 (no lo
 * comparte), así que borrar el original no rompe la copia.
 */
export function MediaLibraryDialog({ open, onOpenChange, items, loading, onUse, usePending }: MediaLibraryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={460}>
        <DialogTitle>Reutilizar un archivo</DialogTitle>
        <DialogDescription>
          Se copia el archivo a esta unidad — no comparte el original, así que borrar uno no afecta al otro.
        </DialogDescription>

        <div className="mt-4 max-h-[55vh] overflow-y-auto pr-1">
          {loading && <p className="text-body-sm font-medium text-fg-faint">Cargando…</p>}

          {!loading && (!items || items.length === 0) && (
            <EmptyState
              compact
              title="Sin archivos para reutilizar"
              description="Todavía no subiste ningún archivo a otra unidad de este curso."
            />
          )}

          {items && items.length > 0 && (
            <ul className="flex flex-col gap-2">
              {items.map((item) => {
                const Icon = TYPE_ICON[item.type];
                return (
                  <li
                    key={item.lessonId}
                    className="flex items-center gap-3 rounded-3xl border border-line p-2.5"
                  >
                    <div
                      className={cn(
                        'grid size-11 shrink-0 place-items-center rounded-2xl',
                        BLOCK_BADGE[item.type],
                      )}
                    >
                      <Icon aria-hidden size={18} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-sm font-bold text-fg">{item.title}</p>
                      <p className="truncate text-tiny font-semibold text-fg-ghost">
                        {item.moduleTitle} · {item.meta}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={usePending}
                      onClick={() => onUse(item)}
                      className="shrink-0"
                    >
                      Usar
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
