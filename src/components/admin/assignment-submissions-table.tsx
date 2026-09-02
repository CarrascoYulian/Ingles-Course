'use client';

import { computeAssignmentStatus, type AssignmentStatus } from '@/features/assignments/submission-rules';
import { cn } from '@/lib/utils';
import type { Assignment, AssignmentSubmission } from '@/types';

export interface AssignmentSubmissionsTableProps {
  assignment: Assignment;
  submissions: AssignmentSubmission[];
  onGrade: (submission: AssignmentSubmission) => void;
  /** Resalta un instante las filas sin calificar — llegada desde la campana de notificaciones. */
  highlightUngraded?: boolean;
}

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  pending: 'Pendiente',
  submitted: 'Entregado',
  graded: 'Calificado',
  overdue: 'Vencido, sin entregar',
};

const STATUS_TONE: Record<AssignmentStatus, string> = {
  pending: 'bg-surface-sunken text-fg-subtle',
  submitted: 'bg-accent-soft text-accent',
  graded: 'bg-brand-soft text-brand',
  overdue: 'bg-danger-soft text-danger-strong',
};

/**
 * Tabla por alumno de UNA tarea concreta — nunca una lista plana de todos
 * los archivos entregados en la plataforma. `submissions` sólo trae quien
 * ya entregó; el llamante decide si además muestra filas de "pendiente"
 * cruzando contra el roster del módulo.
 */
export function AssignmentSubmissionsTable({
  assignment,
  submissions,
  onGrade,
  highlightUngraded,
}: AssignmentSubmissionsTableProps) {
  const now = new Date();

  if (submissions.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-line-dashed bg-surface-subtle p-6 text-center text-body-sm font-semibold text-fg-ghost">
        Todavía no hay entregas para esta tarea.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-line">
      <table className="w-full min-w-[420px] text-left text-body-sm">
        <thead className="bg-surface-muted text-tiny font-extrabold uppercase tracking-eyebrow text-fg-ghost">
          <tr>
            <th className="px-4 py-3">Alumno</th>
            <th className="px-4 py-3">Estado</th>
            <th className="hidden px-4 py-3 sm:table-cell">Entregado</th>
            <th className="px-4 py-3">Nota</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {submissions.map((submission) => {
            const status = computeAssignmentStatus(
              { dueAt: assignment.dueAt, gradedAt: submission.gradedAt },
              true,
              now,
            );
            return (
              <tr
                key={submission.id}
                className={cn(
                  'border-t border-line',
                  highlightUngraded && !submission.gradedAt && 'animate-highlight-flash',
                )}
              >
                <td className="px-4 py-3 font-semibold text-fg">{submission.studentName ?? 'Alumno'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-tiny font-bold ${STATUS_TONE[status]}`}>
                    {STATUS_LABEL[status]}
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-fg-dim sm:table-cell">
                  {new Date(submission.submittedAt).toLocaleDateString('es-DO', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="px-4 py-3 text-fg-dim">{submission.grade ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onGrade(submission)}
                    className="text-tiny font-bold text-brand hover:underline"
                  >
                    {submission.gradedAt ? 'Ver' : 'Calificar'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
