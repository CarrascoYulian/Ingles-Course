'use client';

import { ChevronRight, Check } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { avatarColorFor } from '@/constants/palettes';
import type { Course } from '@/types';

export interface CoursePickerCardProps {
  course: Course;
  onSelect: (course: Course) => void;
}

/** Tarjeta de curso — punto de entrada explícito en vez de caer directo al contenido. */
export function CoursePickerCard({ course, onSelect }: CoursePickerCardProps) {
  const completed = course.progress >= 100;

  return (
    <button type="button" onClick={() => onSelect(course)} className="w-full text-left">
      <Card
        padding="none"
        radius="xl"
        className="group flex flex-col overflow-hidden transition-transform duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-card"
      >
        <div
          aria-hidden
          className="relative h-20 w-full"
          style={{
            background: `linear-gradient(135deg, ${avatarColorFor(course.id)}, ${avatarColorFor(course.id)}99)`,
          }}
        >
          {completed && (
            <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-pill bg-white/95 px-2.5 py-1 text-tiny font-extrabold text-success-strong">
              <Check aria-hidden size={12} strokeWidth={3} />
              Completado
            </span>
          )}
        </div>
        <div className="flex flex-col gap-3 p-[18px]">
          <div>
            <p className="text-tiny font-bold uppercase tracking-wide text-fg-ghost">
              Nivel {course.level}
            </p>
            <h3 className="mt-0.5 text-body-lg font-extrabold tracking-tight-2 text-fg">
              {course.name}
            </h3>
          </div>

          <div>
            <div className="flex items-center justify-between text-tiny font-bold text-fg-ghost">
              <span>Tu progreso</span>
              <span>{course.progress} %</span>
            </div>
            <Progress
              value={course.progress}
              height={6}
              tone={completed ? 'success' : 'brand'}
              className="mt-1.5"
              label={`Progreso en ${course.name}`}
            />
          </div>

          <span className="mt-1 flex items-center gap-1 text-body-sm font-bold text-brand group-hover:gap-1.5">
            {completed ? 'Ver de nuevo' : 'Continuar'}
            <ChevronRight aria-hidden size={15} strokeWidth={2.4} />
          </span>
        </div>
      </Card>
    </button>
  );
}
