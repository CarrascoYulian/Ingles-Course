'use client';

import { ArrowDown, ArrowUp, ExternalLink, GripVertical, X } from 'lucide-react';

import { SquareBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BLOCK_BADGE } from '@/constants/palettes';
import type { ContentBlock } from '@/types';

export interface ContentBlockRowProps {
  block: ContentBlock;
  index: number;
  total: number;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
  /** Sólo se ofrece cuando el bloque tiene un archivo real que abrir. */
  onOpenFile?: () => void;
  openFilePending?: boolean;
}

/**
 * Fila del constructor de contenido.
 *
 * El reordenado por arrastre del diseño se acompaña de botones ↑/↓: el
 * drag-and-drop puro no es operable con teclado, y aquí decide el orden en
 * que el alumno ve el módulo. Los botones son la ruta accesible; el asa
 * queda como afordancia visual.
 */
export function ContentBlockRow({
  block,
  index,
  total,
  onMove,
  onDelete,
  onOpenFile,
  openFilePending,
}: ContentBlockRowProps) {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <li className="flex items-center gap-3 rounded-4xl border border-line bg-surface p-3.5 transition-colors duration-[160ms] hover:border-fg-placeholder md:gap-3.5 md:px-4">
      <span
        aria-hidden
        className="hidden w-[18px] shrink-0 cursor-grab text-fg-placeholder md:block"
      >
        <GripVertical size={16} />
      </span>

      <SquareBadge size={44} className={BLOCK_BADGE[block.type]}>
        {block.type}
      </SquareBadge>

      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-bold text-fg md:text-body">{block.title}</p>
        <p className="mt-0.5 text-caption font-semibold text-fg-ghost md:text-tiny">
          Bloque {index + 1} · {block.meta}
        </p>
      </div>

      <div className="flex shrink-0 gap-[5px] md:gap-1.5">
        {onOpenFile && (
          <Button
            variant="icon"
            size="square"
            onClick={onOpenFile}
            disabled={openFilePending}
            aria-label={`Ver archivo de “${block.title}”`}
            title="Verificar que el archivo existe y abrirlo"
            className="hover:border-brand hover:text-brand disabled:opacity-40"
          >
            <ExternalLink aria-hidden size={13} strokeWidth={2.4} />
          </Button>
        )}
        <Button
          variant="icon"
          size="square"
          onClick={() => onMove(-1)}
          disabled={isFirst}
          aria-label={`Subir “${block.title}”`}
          className="disabled:opacity-40"
        >
          <ArrowUp aria-hidden size={13} strokeWidth={2.4} />
        </Button>
        <Button
          variant="icon"
          size="square"
          onClick={() => onMove(1)}
          disabled={isLast}
          aria-label={`Bajar “${block.title}”`}
          className="disabled:opacity-40"
        >
          <ArrowDown aria-hidden size={13} strokeWidth={2.4} />
        </Button>
        <Button
          variant="icon"
          size="square"
          onClick={onDelete}
          aria-label={`Eliminar “${block.title}”`}
          className="hover:border-danger-line hover:text-danger-strong"
        >
          <X aria-hidden size={13} strokeWidth={2.4} />
        </Button>
      </div>
    </li>
  );
}
