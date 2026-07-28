'use client';

import { Badge, SquareBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LEVEL_BADGE, progressTone } from '@/constants/palettes';
import { cn } from '@/lib/utils';
import type { Course } from '@/types';

export interface CourseCardProps {
  course: Course;
  onToggle: (course: Course) => void;
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => void;
  pending?: boolean;
}

/**
 * Fila de curso del panel docente.
 *
 * En escritorio es una fila horizontal; por debajo de `md` se reorganiza en
 * dos bloques (cabecera + acciones a lo ancho), como en la vista móvil del
 * diseño. Es el mismo componente: no hay dos árboles que mantener.
 */
export function CourseCard({ course, onToggle, onEdit, onDelete, pending }: CourseCardProps) {
  const { name, level, modules, students, progress, published } = course;

  return (
    <article
      className={cn(
        'rounded-6xl border bg-surface p-4 md:flex md:items-center md:gap-4 md:px-[18px]',
        published ? 'border-line' : 'border-line-dashed',
      )}
    >
      <div className="flex items-center gap-3 md:contents">
        <SquareBadge size={40} className={LEVEL_BADGE[level]}>
          {level}
        </SquareBadge>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h3 className="truncate text-body font-bold tracking-tight-2 text-fg md:text-title-xs">
              {name}
            </h3>
            <Badge tone={published ? 'success' : 'warning'} className="hidden md:inline-flex">
              {published ? 'Publicado' : 'Borrador'}
            </Badge>
          </div>

          <p className="mt-0.5 text-caption font-semibold text-fg-ghost md:mt-[3px] md:text-meta">
            {modules} módulos · {students} alumnos
          </p>

          <div className="mt-[9px] hidden md:block">
            <Progress
              value={progress}
              tone={progressTone(progress)}
              className="w-[260px]"
              label={`Avance de ${name}`}
            />
            <p className="mt-[5px] text-caption font-bold text-fg-disabled">
              {published ? `${progress} % de avance promedio` : 'Borrador sin publicar'}
            </p>
          </div>
        </div>

        <Badge tone={published ? 'success' : 'warning'} className="md:hidden">
          {published ? 'Publicado' : 'Borrador'}
        </Badge>
      </div>

      <Progress
        value={progress}
        tone={progressTone(progress)}
        className="mt-[11px] md:hidden"
        label={`Avance de ${name}`}
      />

      <div className="mt-3 flex gap-[7px] md:mt-0 md:shrink-0 md:gap-2">
        <Button variant="ghost" size="sm" onClick={() => onToggle(course)} disabled={pending}>
          {published ? 'Ocultar' : 'Publicar'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(course)}>
          <span className="md:hidden">Módulos</span>
          <span className="hidden md:inline">Editar módulos</span>
        </Button>
        <Button variant="danger" size="sm" onClick={() => onDelete(course)} disabled={pending}>
          Eliminar
        </Button>
      </div>
    </article>
  );
}
