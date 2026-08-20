'use client';

import { CheckCircle2, ClipboardList, Clock, TriangleAlert } from 'lucide-react';

import { avatarColorFor } from '@/constants/palettes';
import { computeAssignmentStatus, type AssignmentStatus } from '@/features/assignments/submission-rules';
import { cn } from '@/lib/utils';
import type { Assignment, AssignmentSubmission } from '@/types';

export interface AssignmentListProps {
  assignments: Assignment[];
  submissionByAssignmentId: Map<string, AssignmentSubmission>;
  onSelect: (assignment: Assignment) => void;
}

const STATUS_ICON: Record<AssignmentStatus, typeof ClipboardList> = {
  pending: Clock,
  submitted: CheckCircle2,
  graded: CheckCircle2,
  overdue: TriangleAlert,
};

const STATUS_LABEL: Record<AssignmentStatus, (submission?: AssignmentSubmission) => string> = {
  pending: () => 'Pendiente',
  submitted: () => 'Entregado — esperando calificación',
  graded: (s) => `Calificado — ${s?.grade ?? '—'}`,
  overdue: () => 'Vencida, sin entregar',
};

/** Índice de tareas, mismo lenguaje visual que `LessonList`. */
export function AssignmentList({ assignments, submissionByAssignmentId, onSelect }: AssignmentListProps) {
  const now = new Date();

  return (
    <ol className="flex flex-col gap-1">
      {assignments.map((assignment) => {
        const submission = submissionByAssignmentId.get(assignment.id);
        const status = computeAssignmentStatus(
          { dueAt: assignment.dueAt, gradedAt: submission?.gradedAt ?? null },
          Boolean(submission),
          now,
        );
        const Icon = STATUS_ICON[status];
        const color = avatarColorFor(assignment.id);

        return (
          <li key={assignment.id}>
            <button
              type="button"
              onClick={() => onSelect(assignment)}
              className="flex w-full items-center gap-3 rounded-2xl border-l-[3px] border-transparent py-2 pl-2.5 pr-3 text-left transition-[background-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-surface-muted"
            >
              <span
                aria-hidden
                className="grid size-11 shrink-0 place-items-center rounded-xl"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
              >
                <Icon aria-hidden size={17} strokeWidth={2.2} className="text-white" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-sm font-semibold text-fg-strong">
                  {assignment.title}
                </span>
                <span
                  className={cn(
                    'mt-0.5 block text-tiny font-bold',
                    status === 'overdue' ? 'text-danger-strong' : 'text-fg-disabled',
                  )}
                >
                  {STATUS_LABEL[status](submission)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
