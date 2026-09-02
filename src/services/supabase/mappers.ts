import { avatarColorFor } from '@/constants/palettes';
import type { Assignment, AssignmentSubmission, Course, Lesson, Module, StudentSummary } from '@/types';
import type { Database } from '@/types';

type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

/**
 * Traducción fila → dominio. Aísla el snake_case de Postgres para que un
 * cambio de esquema no se propague a los componentes.
 */

export function toCourse(
  row: Row<'courses'>,
  aggregates: { students: number; progress: number; modules: number },
): Course {
  return {
    id: row.id,
    name: row.name,
    level: row.level,
    published: row.published,
    archived: row.archived,
    position: row.position,
    students: aggregates.students,
    progress: Math.round(aggregates.progress),
    modules: aggregates.modules,
  };
}

export function toModule(row: Row<'modules'>): Module {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    position: row.position,
    requiresModuleId: row.requires_module_id,
  };
}

export function toLesson(
  row: Row<'lessons'>,
  progress: { watchedPercent: number; completed: boolean } | undefined,
  previousCompleted: boolean,
): Lesson {
  const completed = progress?.completed ?? false;
  // El llamante arranca `previousCompleted` en `true`, así que la primera
  // lección de la lista ya queda "current" por esa vía sola. El
  // `|| row.position === 1` era redundante y podía marcar dos lecciones
  // como "current" a la vez si alguna fila posterior coincidía en posición.
  const state: Lesson['state'] = completed ? 'done' : previousCompleted ? 'current' : 'locked';

  // `duration_seconds` es la fuente real; `duration_minutes` sólo queda como
  // reliquia de antes de que existiera precisión de segundos. Bajo un
  // minuto se muestra "0:SS" en vez de redondear a "1 min" — inventarse un
  // minuto entero para un clip de 6 s es peor que decir la verdad.
  const durationSeconds = row.duration_seconds ?? row.duration_minutes * 60;
  const duration =
    durationSeconds < 60
      ? `0:${String(durationSeconds).padStart(2, '0')}`
      : `${Math.round(durationSeconds / 60)} min`;

  return {
    id: row.id,
    moduleId: row.module_id,
    order: row.position,
    type: row.type,
    title: row.title,
    meta: row.meta,
    duration,
    durationSeconds,
    state,
    watchedPercent: Math.round(progress?.watchedPercent ?? 0),
    mediaKey: row.media_key,
    description: row.description,
    transcript: row.transcript,
    uploadedBy: row.uploaded_by,
  };
}

export function toAssignment(row: Row<'assignments'>): Assignment {
  return {
    id: row.id,
    moduleId: row.module_id,
    title: row.title,
    instructions: row.instructions,
    mediaKey: row.media_key,
    fileName: row.file_name,
    dueAt: row.due_at,
    createdAt: row.created_at,
    order: row.position,
  };
}

/** `studentName` sólo se pasa cuando el llamante ya resolvió el perfil (vista docente). */
export function toAssignmentSubmission(
  row: Row<'assignment_submissions'>,
  studentName?: string,
): AssignmentSubmission {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    studentName,
    kind: row.kind as AssignmentSubmission['kind'],
    mediaKey: row.media_key,
    fileName: row.file_name,
    submittedAt: row.submitted_at,
    grade: row.grade,
    feedback: row.feedback,
    gradedAt: row.graded_at,
  };
}

export function toStudentSummary(
  profile: Row<'profiles'>,
  enrollment: Pick<
    Row<'enrollments'>,
    'progress' | 'watched_minutes' | 'completed_lessons'
  > | null,
): StudentSummary {
  return {
    id: profile.id,
    enrollmentCode: profile.enrollment_code ?? '—',
    name: profile.full_name,
    level: profile.level ?? 'A1',
    progress: Math.round(enrollment?.progress ?? 0),
    hours: Math.round((enrollment?.watched_minutes ?? 0) / 60),
    lessons: enrollment?.completed_lessons ?? 0,
    active: profile.is_active,
    avatarColor: profile.avatar_color ?? avatarColorFor(profile.id),
  };
}
