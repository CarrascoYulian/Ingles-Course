import type { UserRole } from '@/types';

export const ROUTES = {
  home: '/',
  login: '/login',
  /** Destino de `redirectTo` en la invitación de staff (`/api/staff/invite`) — pública, sin sesión previa. */
  aceptarInvitacion: '/aceptar-invitacion',

  admin: {
    root: '/admin',
    dashboard: '/admin/dashboard',
    cursos: '/admin/cursos',
    contenido: '/admin/contenido',
    /** Constructor de contenido de un curso concreto. */
    contenidoDeCurso: (courseId: string) => `/admin/contenido?courseId=${courseId}`,
    /** Deep link a las tareas de un módulo concreto — usado por la campana de notificaciones. */
    tareasDeModulo: (courseId: string, moduleId: string, assignmentId?: string) =>
      `/admin/contenido?courseId=${courseId}&moduleId=${moduleId}&tab=tareas` +
      (assignmentId ? `&assignmentId=${assignmentId}` : ''),
    estudiantes: '/admin/estudiantes',
    reportes: '/admin/reportes',
    cuenta: '/admin/cuenta',
    actividad: '/admin/actividad',
  },

  student: {
    root: '/curso',
    curso: '/curso',
    leccion: (level: string, moduleSlug: string, lessonOrder: number) =>
      `/curso/${level.toLowerCase()}/${moduleSlug}/leccion-${lessonOrder}`,
    logros: '/logros',
    mensajes: '/mensajes',
    tareas: '/tareas',
    certificado: (courseId: string) => `/curso/certificado/${courseId}`,
    foro: (courseId: string) => `/curso/foro/${courseId}`,
    foroTema: (courseId: string, threadId: string) => `/curso/foro/${courseId}/${threadId}`,
  },

  practice: {
    root: '/practica',
    level: (order: number) => `/practica/nivel-${order}`,
  },
} as const;

/** Destino tras iniciar sesión, según rol. */
export const LANDING_BY_ROLE: Record<UserRole, string> = {
  admin: ROUTES.admin.dashboard,
  instructor: ROUTES.admin.dashboard,
  student: ROUTES.student.curso,
};

/** Prefijos que exigen sesión iniciada. */
export const PROTECTED_PREFIXES = ['/admin', '/curso', '/logros', '/practica', '/mensajes', '/tareas'];

/** Prefijos reservados a personal docente (admin + instructor). */
export const STAFF_PREFIXES = ['/admin'];
