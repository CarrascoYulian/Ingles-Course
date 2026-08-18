'use client';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { progressTone } from '@/constants/palettes';
import { cn } from '@/lib/utils';
import type { StudentSummary } from '@/types';

export interface StudentRowProps {
  student: StudentSummary;
  selected: boolean;
  onSelect: (student: StudentSummary) => void;
  /** Tiene al menos un mensaje sin leer por el docente. */
  hasUnreadMessage?: boolean;
  /** Selección para acciones en bloque — independiente de `selected` (que
   * sólo controla qué ficha se ve a la derecha). */
  checked?: boolean;
  onToggleCheck?: (student: StudentSummary) => void;
}

/**
 * Fila de estudiante. Es un `<button>` real dentro de una lista con
 * `aria-selected`: se recorre con Tab y se activa con Intro o Espacio sin
 * añadir manejadores de teclado a mano.
 *
 * El checkbox de selección en bloque vive FUERA de ese botón (no dentro):
 * un checkbox dentro de un `<button>` es inválido — interactivo dentro de
 * interactivo — y además necesita frenar el click con `stopPropagation`
 * para no disparar `onSelect` de la fila al tildarlo.
 */
export function StudentRow({
  student,
  selected,
  onSelect,
  hasUnreadMessage,
  checked = false,
  onToggleCheck,
}: StudentRowProps) {
  const { name, enrollmentCode, level, progress, hours, lessons, active, avatarColor } = student;

  return (
    <li role="option" aria-selected={selected} className="flex items-center gap-1.5">
      {onToggleCheck && (
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggleCheck(student)}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Seleccionar a ${name} para una acción en bloque`}
          className="size-4 shrink-0 cursor-pointer accent-accent"
        />
      )}
      <button
        type="button"
        onClick={() => onSelect(student)}
        className={cn(
          'flex w-full items-center gap-3.5 rounded-3xl border-[1.5px] p-3.5 text-left',
          'transition-[background-color,border-color,transform] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
          '[@media(hover:hover)_and_(pointer:fine)]:active:scale-[0.995]',
          selected
            ? 'border-accent bg-accent-tint'
            : 'border-transparent bg-surface hover:border-line',
        )}
      >
        <span className="relative shrink-0">
          <Avatar name={name} color={avatarColor} size={34} />
          {hasUnreadMessage && (
            <span
              aria-label="Mensaje sin leer"
              className="absolute -right-0.5 -top-0.5 size-[9px] rounded-full bg-danger ring-2 ring-surface"
            />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-body-sm font-bold text-fg">{name}</span>
          <span className="mt-0.5 block truncate text-caption font-semibold text-fg-ghost">
            <span className="lg:hidden">
              {enrollmentCode} · {progress} % · {hours} h
            </span>
            <span className="hidden lg:inline">
              {enrollmentCode} · {level} · {lessons} lecciones
            </span>
          </span>
        </span>

        <span className="hidden w-[110px] shrink-0 lg:block">
          <Progress value={progress} tone={progressTone(progress)} height={5} />
          <span className="mt-[5px] block text-caption font-bold text-fg-dim">
            {progress} % · {hours} h
          </span>
        </span>

        <Badge tone={active ? 'success' : 'danger'}>{active ? 'Activo' : 'Inactivo'}</Badge>
      </button>
    </li>
  );
}
