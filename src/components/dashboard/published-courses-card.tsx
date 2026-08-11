'use client';

import { useState } from 'react';

import { SquareBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LEVEL_BADGE, progressTone } from '@/constants/palettes';
import { cn } from '@/lib/utils';
import type { Course } from '@/types';

export interface PublishedCoursesCardProps {
  courses: Course[];
  onPublish: (course: Course) => void;
}

const COLLAPSED_COUNT = 5;

/** Resumen de cursos en el dashboard: publicados con barra, borradores con CTA. */
export function PublishedCoursesCard({ courses, onPublish }: PublishedCoursesCardProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? courses : courses.slice(0, COLLAPSED_COUNT);
  const hasMore = courses.length > COLLAPSED_COUNT;

  return (
    <Card padding="lg" radius="xl">
      <h3 className="text-title-sm font-bold tracking-tight-2 text-fg">Cursos publicados</h3>

      <ul className={cn('mt-3.5 flex flex-col gap-[9px]', expanded && 'max-h-[360px] overflow-y-auto')}>
        {visible.map((course) => (
          <li
            key={course.id}
            className={cn(
              'flex items-center gap-3.5 rounded-3xl px-3.5 py-[13px]',
              course.published
                ? 'border border-line transition-colors duration-[160ms] hover:border-brand'
                : 'border border-dashed border-line-dashed bg-surface-subtle',
            )}
          >
            <SquareBadge size={38} className={LEVEL_BADGE[course.level]}>
              {course.level}
            </SquareBadge>

            <div className="min-w-0 flex-1">
              <p className="truncate text-body-sm font-bold text-fg">{course.name}</p>
              {course.published ? (
                <Progress
                  value={course.progress}
                  tone={progressTone(course.progress)}
                  className="mt-[7px]"
                  label={`Avance de ${course.name}`}
                />
              ) : (
                <p className="mt-[3px] text-caption font-semibold text-fg-ghost">
                  Borrador · {course.modules} módulos listos
                </p>
              )}
            </div>

            {course.published ? (
              <div className="shrink-0 text-right">
                <p className="text-meta font-extrabold text-fg">{course.progress} %</p>
                <p className="text-micro font-semibold text-fg-ghost">
                  {course.students} alumnos
                </p>
              </div>
            ) : (
              <Button variant="outline" size="xs" onClick={() => onPublish(course)}>
                Publicar
              </Button>
            )}
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 w-full rounded-xl py-2 text-center text-tiny font-bold text-fg-dim transition-colors hover:bg-surface-sunken hover:text-fg"
        >
          {expanded ? 'Mostrar menos' : `Mostrar ${courses.length - COLLAPSED_COUNT} más`}
        </button>
      )}
    </Card>
  );
}
