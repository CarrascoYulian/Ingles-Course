'use client';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { StudentPerformanceSummary } from '@/types';

export interface StudentPerformanceRowProps {
  student: StudentPerformanceSummary;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Fila de rendimiento por alumno — sólo vive en Reportes. El dashboard
 * general no muestra individuos; ver `project_dashboard_no_per_student_view`.
 */
export function StudentPerformanceRow({ student }: StudentPerformanceRowProps) {
  const { name, enrollmentCode, level, avatarColor, avgScore, passRate, attempts, lastAttemptAt } = student;

  return (
    <li className="flex items-center gap-3.5 rounded-3xl border-[1.5px] border-transparent bg-surface p-3.5">
      <Avatar name={name} color={avatarColor} size={34} />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-bold text-fg">{name}</span>
        <span className="mt-0.5 block truncate text-caption font-semibold text-fg-ghost">
          {enrollmentCode} · {level}
        </span>
      </span>

      <span className="hidden w-20 shrink-0 text-right sm:block">
        <span className="block text-body-sm font-extrabold text-fg">
          {avgScore === null ? '—' : `${avgScore} %`}
        </span>
        <span className="block text-caption font-semibold text-fg-ghost">Promedio</span>
      </span>

      <span className="hidden w-20 shrink-0 text-right md:block">
        <span className="block text-body-sm font-extrabold text-fg">
          {passRate === null ? '—' : `${passRate} %`}
        </span>
        <span className="block text-caption font-semibold text-fg-ghost">Aprobado</span>
      </span>

      <span className="hidden w-24 shrink-0 text-right lg:block">
        <span className="block text-body-sm font-extrabold text-fg">{formatDate(lastAttemptAt)}</span>
        <span className="block text-caption font-semibold text-fg-ghost">Último intento</span>
      </span>

      <Badge tone={attempts > 0 ? 'neutral' : 'warning'}>
        {attempts > 0 ? `${attempts} intento${attempts === 1 ? '' : 's'}` : 'Sin evaluar'}
      </Badge>
    </li>
  );
}
