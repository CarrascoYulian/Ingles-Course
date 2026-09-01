'use client';

import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LEVEL_BADGE } from '@/constants/palettes';
import type { Course } from '@/types';

export interface CoursePickerCardProps {
  course: Course;
  onSelect: (course: Course) => void;
}

/**
 * Tarjeta de curso con diseño EdTech moderno inspirado en Coursera y MasterClass.
 */
export function CoursePickerCard({ course, onSelect }: CoursePickerCardProps) {
  const completed = course.progress >= 100;

  return (
    <button
      type="button"
      onClick={() => onSelect(course)}
      className="group w-full text-left focus-visible:outline-none"
    >
      <Card
        variant="hover"
        padding="none"
        radius="xl"
        className="flex h-full flex-col overflow-hidden border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card"
      >
        {/* Banner superior con gradiente de nivel y badges flotantes */}
        <div className="relative h-24 w-full bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 p-3.5 flex items-start justify-between">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-micro font-extrabold shadow-sm ${LEVEL_BADGE[course.level]}`}>
            NIVEL {course.level}
          </span>

          {completed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 backdrop-blur-sm px-2.5 py-0.5 text-micro font-extrabold text-white shadow-sm">
              <CheckCircle2 aria-hidden className="size-3" />
              Completado
            </span>
          ) : (
            course.progress > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-micro font-extrabold text-white">
                <Sparkles aria-hidden className="size-3 text-amber-300" />
                En curso
              </span>
            )
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between p-5">
          <div>
            <h3 className="text-title font-extrabold tracking-tight text-slate-900 dark:text-white group-hover:text-brand dark:group-hover:text-blue-400 transition-colors">
              {course.name}
            </h3>
            <p className="mt-1 text-meta font-medium text-slate-500 dark:text-slate-400 line-clamp-2">
              Programa estructurado con ejercicios guiados y evaluaciones.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-caption font-bold text-slate-600 dark:text-slate-400 mb-1.5">
              <span>Progreso de estudio</span>
              <span className="font-extrabold tabular-nums text-slate-900 dark:text-white">{course.progress}%</span>
            </div>
            <Progress
              value={course.progress}
              height={6}
              tone={completed ? 'success' : 'accent'}
              label={`Progreso en ${course.name}`}
            />

            <div className="mt-4 flex items-center justify-between">
              <span className="text-caption font-bold text-slate-400 dark:text-slate-500">
                {completed ? 'Repasar contenido' : 'Continuar lección'}
              </span>
              <span className="inline-flex items-center gap-1 text-body-sm font-extrabold text-brand dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                Entrar
                <ArrowRight aria-hidden className="size-4" />
              </span>
            </div>
          </div>
        </div>
      </Card>
    </button>
  );
}

