'use client';

import { Check, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import type { Lesson } from '@/types';

export interface LessonListProps {
  lessons: Lesson[];
  onSelect?: (lesson: Lesson) => void;
}

/**
 * Índice del módulo.
 *
 * Las lecciones bloqueadas siguen siendo enfocables y explican por qué lo
 * están al activarse: `disabled` las sacaría del orden de tabulación y el
 * alumno no tendría forma de saberlo con teclado o lector de pantalla.
 */
export function LessonList({ lessons, onSelect }: LessonListProps) {
  return (
    <ol className="flex flex-col gap-1">
      {lessons.map((lesson) => {
        const isCurrent = lesson.state === 'current';
        const isLocked = lesson.state === 'locked';
        const isDone = lesson.state === 'done';

        return (
          <li key={lesson.id}>
            <button
              type="button"
              aria-current={isCurrent ? 'step' : undefined}
              aria-disabled={isLocked || undefined}
              onClick={() => {
                if (isLocked) {
                  toast(`Termina la lección ${lesson.order - 1} para desbloquear esta`);
                  return;
                }
                onSelect?.(lesson);
              }}
              className={cn(
                'flex w-full items-center gap-[11px] rounded-2xl border-[1.5px] px-3 py-[11px] text-left',
                'transition-[background-color,border-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
                isCurrent
                  ? 'border-accent bg-accent-tint'
                  : 'border-transparent hover:bg-surface-muted',
                isLocked && 'cursor-not-allowed opacity-55 hover:bg-transparent',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'grid size-[26px] shrink-0 place-items-center rounded-full text-tiny font-extrabold',
                  isDone && 'bg-success text-white',
                  isCurrent && 'bg-accent text-white',
                  isLocked && 'bg-line-soft text-fg-disabled',
                )}
              >
                {isDone ? <Check size={13} strokeWidth={3} /> : isLocked ? '·' : lesson.order}
              </span>

              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-body-sm',
                  isCurrent ? 'font-bold text-fg-strong' : 'font-semibold',
                  isLocked ? 'text-fg-faint' : 'text-fg-strong',
                )}
              >
                {lesson.title}
              </span>

              <span className="flex shrink-0 items-center gap-1 text-tiny font-bold text-fg-disabled">
                {isLocked && <Lock aria-hidden size={11} strokeWidth={2.4} />}
                {isLocked ? 'Bloqueada' : lesson.duration}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
