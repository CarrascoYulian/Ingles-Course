'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, ClipboardList, GripVertical, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Assignment } from '@/types';

export interface AssignmentRowProps {
  assignment: Assignment;
  index: number;
  total: number;
  submissionCount: number;
  gradedCount: number;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  /** Resalta un instante esta fila — llegada desde la campana de notificaciones. */
  highlighted?: boolean;
}

/**
 * Fila de tarea en la lista del módulo — mismo lenguaje visual que
 * `QuizBlockRow`. El reordenado por arrastre (asa `GripVertical`, vía
 * dnd-kit) convive con los botones ↑/↓ por la misma razón que en
 * `ContentBlockRow`: el drag-and-drop puro no es operable con teclado.
 */
export function AssignmentRow({
  assignment,
  index,
  total,
  submissionCount,
  gradedCount,
  onOpen,
  onEdit,
  onDelete,
  onMove,
  highlighted,
}: AssignmentRowProps) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const dueLabel = new Date(assignment.dueAt).toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
  });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: assignment.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-4 rounded-5xl border border-line bg-surface p-4 transition-colors duration-[160ms]',
        highlighted && 'animate-highlight-flash',
        isDragging && 'relative z-10 shadow-lg',
      )}
    >
      <span
        aria-hidden={false}
        aria-label={`Arrastrar para reordenar “${assignment.title}”`}
        {...attributes}
        {...listeners}
        className={cn(
          'hidden w-[18px] shrink-0 text-fg-placeholder md:block',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
      >
        <GripVertical size={16} />
      </span>

      <button
        type="button"
        onClick={onOpen}
        className="grid size-20 shrink-0 place-items-center rounded-3xl bg-brand-soft text-brand"
      >
        <ClipboardList aria-hidden size={26} strokeWidth={1.8} />
      </button>

      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className="truncate text-body font-bold text-fg md:text-body-lg">{assignment.title}</p>
        <p className="mt-0.5 text-tiny font-semibold text-fg-ghost md:text-meta">
          Vence {dueLabel} · {submissionCount} {submissionCount === 1 ? 'entrega' : 'entregas'} ·{' '}
          {gradedCount} {gradedCount === 1 ? 'calificada' : 'calificadas'}
        </p>
      </button>

      <div className="flex shrink-0 gap-[5px] md:gap-1.5">
        <Button
          variant="icon"
          size="square"
          onClick={onEdit}
          aria-label="Editar tarea"
          className="hover:border-brand hover:text-brand"
        >
          <Pencil aria-hidden size={13} strokeWidth={2.4} />
        </Button>
        <Button
          variant="icon"
          size="square"
          onClick={() => onMove(-1)}
          disabled={isFirst}
          aria-label={`Subir “${assignment.title}”`}
          className="disabled:opacity-40"
        >
          <ArrowUp aria-hidden size={13} strokeWidth={2.4} />
        </Button>
        <Button
          variant="icon"
          size="square"
          onClick={() => onMove(1)}
          disabled={isLast}
          aria-label={`Bajar “${assignment.title}”`}
          className="disabled:opacity-40"
        >
          <ArrowDown aria-hidden size={13} strokeWidth={2.4} />
        </Button>
        <Button
          variant="icon"
          size="square"
          onClick={onDelete}
          aria-label="Eliminar tarea"
          className="hover:border-danger-line hover:text-danger-strong"
        >
          <Trash2 aria-hidden size={13} strokeWidth={2.4} />
        </Button>
      </div>
    </li>
  );
}
