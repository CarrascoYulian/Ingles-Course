'use client';

import {
  CheckCircle2,
  FileAudio,
  FileText,
  ListChecks,
  Lock,
  PlayCircle,
  Trophy,
  Video as VideoIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import type { BlockType, Lesson } from '@/types';

const TYPE_ICON: Record<BlockType, typeof VideoIcon> = {
  Video: VideoIcon,
  PDF: FileText,
  Audio: FileAudio,
  Ejercicio: ListChecks,
  Evaluación: Trophy,
};

export interface LessonListProps {
  lessons: Lesson[];
  quiz?: { state: 'done' | 'available' | 'locked' } | null;
  onSelect?: (lesson: Lesson) => void;
  onSelectQuiz?: () => void;
}

/**
 * Índice de lecciones estilo currículum moderno de Coursera / LinkedIn Learning.
 */
export function LessonList({ lessons, quiz, onSelect, onSelectQuiz }: LessonListProps) {
  return (
    <ol className="flex flex-col gap-1.5">
      {lessons.map((lesson) => {
        const isCurrent = lesson.state === 'current';
        const isLocked = lesson.state === 'locked';
        const isDone = lesson.state === 'done';

        const TypeIcon = TYPE_ICON[lesson.type] || VideoIcon;

        return (
          <li key={lesson.id}>
            <button
              type="button"
              aria-current={isCurrent ? 'step' : undefined}
              aria-disabled={isLocked || undefined}
              onClick={() => {
                if (isLocked) {
                  toast(`Completa la lección ${lesson.order - 1} para desbloquear esta.`);
                  return;
                }
                onSelect?.(lesson);
              }}
              className={cn(
                'group flex w-full items-center gap-3.5 rounded-2xl p-2.5 text-left transition-all duration-150',
                isCurrent
                  ? 'border border-blue-200/90 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/60 shadow-sm'
                  : 'border border-transparent hover:border-slate-200/80 dark:hover:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60',
                isLocked && 'cursor-not-allowed opacity-50 hover:border-transparent hover:bg-transparent',
              )}
            >
              {/* Icono de estado / formato */}
              <div
                className={cn(
                  'grid size-10 shrink-0 place-items-center rounded-xl transition-all',
                  isDone
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : isCurrent
                      ? 'bg-brand text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                      : isLocked
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60 group-hover:text-brand dark:group-hover:text-blue-300',
                )}
              >
                {isLocked ? (
                  <Lock aria-hidden className="size-4" />
                ) : isDone ? (
                  <CheckCircle2 aria-hidden className="size-5" />
                ) : isCurrent ? (
                  <PlayCircle aria-hidden className="size-5 animate-pulse" />
                ) : (
                  <TypeIcon aria-hidden className="size-4.5" />
                )}
              </div>

              {/* Título y metadatos */}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'truncate text-body-sm font-extrabold',
                    isCurrent
                      ? 'text-brand dark:text-blue-400'
                      : isLocked
                        ? 'text-slate-400 dark:text-slate-600'
                        : 'text-slate-900 dark:text-slate-100',
                  )}
                >
                  {lesson.title}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-micro font-bold text-slate-500 dark:text-slate-400">
                  <span className="font-mono">Lección {lesson.order}</span>
                  <span>•</span>
                  <span>{lesson.duration || '5 min'}</span>
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-950/80 px-2 py-0.2 text-[9px] font-extrabold text-brand dark:text-blue-300 uppercase tracking-wider">
                      En curso
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}

      {/* Tarjeta de evaluación final del módulo */}
      {quiz && (
        <li className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            aria-disabled={quiz.state === 'locked' || undefined}
            onClick={() => {
              if (quiz.state === 'locked') {
                toast('Completa todas las lecciones del módulo para desbloquear el examen.');
                return;
              }
              onSelectQuiz?.();
            }}
            className={cn(
              'group flex w-full items-center gap-3.5 rounded-2xl p-2.5 text-left transition-all duration-150',
              quiz.state === 'available'
                ? 'border border-amber-300 dark:border-amber-700/60 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 shadow-glow-gold'
                : quiz.state === 'done'
                  ? 'border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-sm'
                  : 'border border-transparent opacity-50 cursor-not-allowed',
            )}
          >
            <div
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-xl font-bold shadow-sm',
                quiz.state === 'done'
                  ? 'bg-emerald-500 text-white'
                  : quiz.state === 'available'
                    ? 'bg-amber-500 text-white shadow-glow-gold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600',
              )}
            >
              {quiz.state === 'done' ? (
                <CheckCircle2 aria-hidden className="size-5" />
              ) : quiz.state === 'locked' ? (
                <Lock aria-hidden className="size-4" />
              ) : (
                <Trophy aria-hidden className="size-5 animate-bounce" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'truncate text-body-sm font-extrabold',
                  quiz.state === 'available'
                    ? 'text-amber-950 dark:text-amber-200 font-black'
                    : quiz.state === 'done'
                      ? 'text-emerald-950 dark:text-emerald-200 font-bold'
                      : 'text-slate-400 dark:text-slate-600',
                )}
              >
                Evaluación del Módulo
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-micro font-bold text-slate-500 dark:text-slate-400">
                <span
                  className={
                    quiz.state === 'done'
                      ? 'text-emerald-700 dark:text-emerald-400 font-extrabold'
                      : quiz.state === 'available'
                        ? 'text-amber-700 dark:text-amber-400 font-extrabold'
                        : 'text-slate-400 dark:text-slate-600'
                  }
                >
                  {quiz.state === 'done' ? '✓ Aprobada' : quiz.state === 'available' ? '★ Obligatoria para avanzar' : 'Bloqueada'}
                </span>
              </div>
            </div>
          </button>
        </li>
      )}
    </ol>
  );
}

