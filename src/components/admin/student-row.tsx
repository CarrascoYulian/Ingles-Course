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
}

/**
 * Fila de estudiante. Es un `<button>` real dentro de una lista con
 * `aria-selected`: se recorre con Tab y se activa con Intro o Espacio sin
 * añadir manejadores de teclado a mano.
 */
export function StudentRow({ student, selected, onSelect }: StudentRowProps) {
  const { name, enrollmentCode, level, progress, hours, lessons, active, avatarColor } = student;

  return (
    <li role="option" aria-selected={selected}>
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
        <Avatar name={name} color={avatarColor} size={34} />

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

        <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Activo' : 'Inactivo'}</Badge>
      </button>
    </li>
  );
}
