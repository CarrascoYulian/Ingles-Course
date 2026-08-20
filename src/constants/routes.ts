import type { UserRole } from '@/types';

export const ROUTES = {
  home: '/',
  login: '/login',

  admin: {
    root: '/admin',
    dashboard: '/admin/dashboard',
    cursos: '/admin/cursos',
    contenido: '/admin/contenido',
    /** Constructor de contenido de un curso concreto. */
    contenidoDeCurso: (courseId: string) => `/admin/contenido?courseId=${courseId}`,
    estudiantes: '/admin/estudiantes',
    reportes: '/admin/reportes',
  },

  student: {
    root: '/curso',
    curso: '/curso',
    leccion: (level: string, moduleSlug: string, lessonOrder: number) =>
      `/curso/${level.toLowerCase()}/${moduleSlug}/leccion-${lessonOrder}`,
    logros: '/logros',
    mensajes: '/mensajes',
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
export const PROTECTED_PREFIXES = ['/admin', '/curso', '/logros', '/practica', '/mensajes'];

/** Prefijos reservados a personal docente (admin + instructor). */
export const STAFF_PREFIXES = ['/admin'];
