import { Award } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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

/** Tarjeta «Tu progreso» del raíl derecho del alumno. */
export function ProgressCard({ percent, level, hours, lessons, badges, courseId }: ProgressCardProps) {
  return (
    <Card padding="lg" radius="xl">
      <div className="flex items-center justify-between">
        <h2 className="text-body-lg font-bold text-fg">Tu progreso</h2>
        <Badge tone="accent">Nivel {level}</Badge>
      </div>

      <p className="mt-3.5 flex items-baseline gap-1.5">
        <span className="text-display-lg font-extrabold tracking-display-lg text-fg">
          {percent}
        </span>
        <span className="text-title-xs font-bold text-fg-ghost">% del curso</span>
      </p>

      <Progress value={percent} height={6} className="mt-2.5" label="Progreso del curso" />

      <dl className="mt-4 grid grid-cols-3 gap-2.5">
        <div>
          <dd className="text-title font-extrabold text-fg">{hours} h</dd>
          <dt className="text-micro font-bold text-fg-ghost">estudiadas</dt>
        </div>
        <div>
          <dd className="text-title font-extrabold text-fg">{lessons}</dd>
          <dt className="text-micro font-bold text-fg-ghost">lecciones</dt>
        </div>
        <div>
          <dd className="text-title font-extrabold text-warning">{badges}</dd>
          <dt className="text-micro font-bold text-fg-ghost">insignias</dt>
        </div>
      </dl>

      {percent >= 100 && courseId && (
        <Link
          href={ROUTES.student.certificado(courseId)}
          className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-surface-muted py-2.5 text-body-sm font-bold text-fg hover:border-fg-placeholder"
        >
          <Award aria-hidden size={15} strokeWidth={2.2} />
          Ver certificado
        </Link>
      )}
    </Card>
  );
}
