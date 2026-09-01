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
                  ? 'border border-blue-200/90 bg-blue-50/80 shadow-sm'
                  : 'border border-transparent hover:border-slate-200/80 hover:bg-slate-50',
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
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-brand',
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
                    isCurrent ? 'text-brand' : isLocked ? 'text-slate-400' : 'text-slate-900',
                  )}
                >
                  {lesson.title}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-micro font-bold text-slate-500">
                  <span className="font-mono">Lección {lesson.order}</span>
                  <span>•</span>
                  <span>{lesson.duration || '5 min'}</span>
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.2 text-[9px] font-extrabold text-brand uppercase tracking-wider">
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
        <li className="mt-2 pt-2 border-t border-slate-100">
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
                ? 'border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 shadow-glow-gold'
                : quiz.state === 'done'
                  ? 'border border-emerald-200 bg-emerald-50/70 shadow-sm'
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
                    : 'bg-slate-100 text-slate-400',
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
                    ? 'text-amber-950 font-black'
                    : quiz.state === 'done'
                      ? 'text-emerald-950 font-bold'
                      : 'text-slate-400',
                )}
              >
                Evaluación del Módulo
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-micro font-bold text-slate-500">
                <span className={quiz.state === 'done' ? 'text-emerald-700 font-extrabold' : 'text-amber-700 font-extrabold'}>
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

