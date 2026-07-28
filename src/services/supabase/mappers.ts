import { avatarColorFor } from '@/constants/palettes';
import type { ContentBlock, Course, Lesson, Module, StudentSummary } from '@/types';
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

export function toContentBlock(row: Row<'content_blocks'>): ContentBlock {
  return {
    id: row.id,
    moduleId: row.module_id,
    type: row.type,
    title: row.title,
    meta: row.meta,
    position: row.position,
    mediaKey: row.media_key,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

export function toLesson(
  row: Row<'lessons'>,
  progress: { watchedPercent: number; completed: boolean } | undefined,
  previousCompleted: boolean,
): Lesson {
  const completed = progress?.completed ?? false;
  const state: Lesson['state'] = completed
    ? 'done'
    : previousCompleted || row.position === 1
      ? 'current'
      : 'locked';

  return {
    id: row.id,
    moduleId: row.module_id,
    order: row.position,
    title: row.title,
    duration: `${row.duration_minutes} min`,
    state,
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
