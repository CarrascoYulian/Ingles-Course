'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROUTES } from '@/constants/routes';
import { useMyNotifications } from '@/features/learning/hooks/use-learning';
import { cn } from '@/lib/utils';
import type { AssignmentNotificationTarget } from '@/types';

/**
 * Espejo de `NotificationBell` del admin (mismas 3 fuentes: por vencer,
 * nueva, calificada) pero del lado del alumno — mismo polling de 20s,
 * mismo cálculo en vivo sin tabla de notificaciones nueva.
 */
export function StudentNotificationBell() {
  const { data } = useMyNotifications();
  const dueSoon = data?.dueSoon.count ?? 0;
  const newAssignments = data?.newAssignments.count ?? 0;
  const graded = data?.graded.count ?? 0;
  const total = dueSoon + newAssignments + graded;
  const urgent = data?.dueSoon.urgent ?? false;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={total > 0 ? `${total} notificaciones` : 'Notificaciones'}
          className={cn(
            'relative grid size-9 shrink-0 place-items-center rounded-xl border border-line-strong bg-surface text-fg-subtle',
            'transition-colors duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-fg-placeholder',
          )}
        >
          <Bell aria-hidden size={16} strokeWidth={1.9} />
          {total > 0 && (
            <span
              className={cn(
                'absolute -right-1 -top-1 grid size-[17px] place-items-center rounded-full text-micro font-extrabold text-white',
                urgent ? 'bg-danger' : 'bg-brand',
              )}
            >
              {total > 9 ? '9+' : total}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[260px]">
        <NotificationRow
          target={data?.dueSoon.target}
          label={urgent ? '¡Vence mañana!' : 'Tareas por vencer'}
          count={dueSoon}
        />
        <NotificationRow
          target={data?.newAssignments.target}
          label="Tarea nueva"
          count={newAssignments}
        />
        <NotificationRow target={data?.graded.target} label="Tarea calificada" count={graded} />
        {total === 0 && (
          <p className="px-2.5 py-2 text-meta font-medium text-fg-faint">Sin novedades</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationRow({
  target,
  label,
  count,
}: {
  target: AssignmentNotificationTarget | null | undefined;
  label: string;
  count: number;
}) {
  if (count === 0) return null;

  const content = (
    <div className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-label font-semibold text-fg">
      {label}
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-danger-soft text-tiny font-extrabold text-danger-strong">
        {count > 9 ? '9+' : count}
      </span>
    </div>
  );

  return target ? (
    <Link href={ROUTES.student.tareaDeCurso(target.courseId, target.assignmentId)} className="block hover:bg-surface-muted">
      {content}
    </Link>
  ) : (
    content
  );
}
