/**
 * Reglas puras de edición/estado de una entrega de tarea, separadas de
 * cualquier hook o componente para poder probarlas sin React — ver
 * `submission-rules.test.ts`. Tanto la UI (deshabilitar botones) como los
 * backends (mensajes de error antes de dejar que RLS rechace en seco) usan
 * esta misma función, para no duplicar el criterio de inmutabilidad.
 */

export interface AssignmentSubmissionState {
  dueAt: string;
  gradedAt: string | null;
}

/** Antes de vencer y sin calificar: el alumno puede subir su entrega. */
export function canStudentSubmit(assignment: AssignmentSubmissionState, now: Date): boolean {
  return assignment.gradedAt === null && new Date(assignment.dueAt) > now;
}

/**
 * Borrar (para poder resubir) exige la misma condición que subir — en
 * cuanto vence la fecha o el docente califica, lo que ocurra primero, la
 * entrega queda inmutable.
 */
export function canStudentDelete(assignment: AssignmentSubmissionState, now: Date): boolean {
  return canStudentSubmit(assignment, now);
}

export type AssignmentStatus = 'pending' | 'submitted' | 'graded' | 'overdue';

/** Estado visible en la tabla del docente y en la lista del alumno. */
export function computeAssignmentStatus(
  assignment: AssignmentSubmissionState,
  hasSubmission: boolean,
  now: Date,
): AssignmentStatus {
  if (assignment.gradedAt !== null) return 'graded';
  if (hasSubmission) return 'submitted';
  return new Date(assignment.dueAt) > now ? 'pending' : 'overdue';
}
