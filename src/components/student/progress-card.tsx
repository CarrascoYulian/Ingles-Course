import { Award, BookOpen, Clock, Trophy } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LEVEL_BADGE } from '@/constants/palettes';
import { ROUTES } from '@/constants/routes';
import type { CefrLevel } from '@/types';

export interface ProgressCardProps {
  percent: number;
  level: CefrLevel;
  hours: number;
  lessons: number;
  badges: number;
  /** Si se pasa y `percent` llega a 100, ofrece el enlace al certificado. */
  courseId?: string;
}

/**
 * Tarjeta «Tu progreso» con estadísticas y llamada a certificado.
 */
export function ProgressCard({ percent, level, hours, lessons, badges, courseId }: ProgressCardProps) {
  const isComplete = percent >= 100;

  return (
    <Card padding="lg" radius="xl" className="border border-slate-200/90 shadow-card bg-white">
      <div className="flex items-center justify-between">
        <h2 className="text-body font-extrabold text-slate-900">Tu avance</h2>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-micro font-extrabold shadow-sm ${LEVEL_BADGE[level]}`}>
          NIVEL {level}
        </span>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-display-sm font-extrabold tracking-tight text-slate-900 tabular-nums">
            {percent}
          </span>
          <span className="text-title-xs font-bold text-slate-500">% completado</span>
        </div>
        <span className="text-caption font-bold text-slate-400">Objetivo del curso</span>
      </div>

      <Progress
        value={percent}
        height={8}
        tone={isComplete ? 'success' : 'accent'}
        className="mt-2.5"
        label="Progreso general del curso"
      />

      <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 border border-slate-100">
        <div className="flex flex-col items-center text-center">
          <span className="mb-1 grid size-7 place-items-center rounded-lg bg-blue-100/70 text-brand">
            <Clock aria-hidden className="size-3.5" />
          </span>
          <span className="text-title-xs font-extrabold text-slate-900 tabular-nums">{hours}h</span>
          <span className="text-micro font-bold text-slate-500">Estudio</span>
        </div>

        <div className="flex flex-col items-center text-center border-x border-slate-200/70 px-1">
          <span className="mb-1 grid size-7 place-items-center rounded-lg bg-emerald-100/70 text-emerald-600">
            <BookOpen aria-hidden className="size-3.5" />
          </span>
          <span className="text-title-xs font-extrabold text-slate-900 tabular-nums">{lessons}</span>
          <span className="text-micro font-bold text-slate-500">Lecciones</span>
        </div>

        <div className="flex flex-col items-center text-center">
          <span className="mb-1 grid size-7 place-items-center rounded-lg bg-amber-100/70 text-amber-600">
            <Trophy aria-hidden className="size-3.5" />
          </span>
          <span className="text-title-xs font-extrabold text-amber-600 tabular-nums">{badges}</span>
          <span className="text-micro font-bold text-slate-500">Insignias</span>
        </div>
      </div>

      {isComplete && courseId && (
        <Button asChild variant="glow" size="md" className="mt-4 w-full justify-center font-extrabold shadow-glow-gold">
          <Link href={ROUTES.student.certificado(courseId)}>
            <Award aria-hidden className="size-4" />
            Ver certificado oficial
          </Link>
        </Button>
      )}
    </Card>
  );
}

