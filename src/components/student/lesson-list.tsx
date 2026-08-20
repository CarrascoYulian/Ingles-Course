'use client';

import { Check, ClipboardCheck, FileAudio, FileText, ListChecks, Lock, Play, Video as VideoIcon } from 'lucide-react';
import { toast } from 'sonner';

import { avatarColorFor } from '@/constants/palettes';
import { cn } from '@/lib/utils';
import type { BlockType, Lesson } from '@/types';

const TYPE_ICON: Record<BlockType, typeof VideoIcon> = {
  Video: VideoIcon,
  PDF: FileText,
  Audio: FileAudio,
  Ejercicio: ListChecks,
  Evaluación: ClipboardCheck,
};

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

        const color = avatarColorFor(lesson.id);

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
                'flex w-full items-center gap-3 rounded-2xl border-l-[3px] py-2 pl-2.5 pr-3 text-left',
                'transition-[background-color,border-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
                isCurrent
                  ? 'border-accent bg-accent-tint'
                  : 'border-transparent hover:bg-surface-muted',
                isLocked && 'cursor-not-allowed opacity-55 hover:bg-transparent',
              )}
            >
              <span
                aria-hidden
                className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl"
                style={{
                  background: isLocked
                    ? undefined
                    : `linear-gradient(135deg, ${color}, ${color}99)`,
                }}
              >
                {isLocked ? (
                  <span className="grid size-full place-items-center bg-line-soft">
                    <Lock aria-hidden size={15} strokeWidth={2.2} className="text-fg-disabled" />
                  </span>
                ) : isDone ? (
                  <Check aria-hidden size={18} strokeWidth={3} className="text-white" />
                ) : lesson.type === 'Video' ? (
                  <Play
                    aria-hidden
                    size={16}
                    strokeWidth={0}
                    fill="white"
                    className="translate-x-[1px]"
                  />
                ) : (
                  (() => {
                    const TypeIcon = TYPE_ICON[lesson.type];
                    return <TypeIcon aria-hidden size={15} strokeWidth={2.2} className="text-white" />;
                  })()
                )}
                <span className="absolute bottom-0 left-0 right-0 bg-black/45 py-[1px] text-center text-[8px] font-extrabold leading-tight text-white">
                  {isLocked ? '—' : lesson.duration}
                </span>
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block truncate text-body-sm',
                    isCurrent ? 'font-bold text-fg-strong' : 'font-semibold',
                    isLocked ? 'text-fg-faint' : 'text-fg-strong',
                  )}
                >
                  {lesson.title}
                </span>
                <span className="mt-0.5 block text-tiny font-bold text-fg-disabled">
                  {isLocked ? 'Bloqueada' : `Lección ${lesson.order}`}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
