export * from './routes';
export * from './navigation';
export * from './motion';
export * from './palettes';

export const APP_NAME = 'Bertho Community';
export const APP_TAGLINE = 'Aprende inglés con un método guiado, medible y sin relleno.';

/** Claves raíz de la caché de TanStack Query. */
export const QUERY_KEYS = {
  session: ['session'] as const,
  courses: ['courses'] as const,
  course: (id: string) => ['courses', id] as const,
  modules: (courseId: string) => ['modules', courseId] as const,
  blocks: (moduleId: string) => ['blocks', moduleId] as const,
  students: (filters?: unknown) => ['students', filters ?? {}] as const,
  studentEnrollments: (studentId: string) => ['student-enrollments', studentId] as const,
  moduleAccess: (studentId: string, courseId: string) => ['module-access', studentId, courseId] as const,
  dashboard: ['dashboard'] as const,
  report: (range: string) => ['report', range] as const,
  lessons: (moduleId: string) => ['lessons', moduleId] as const,
  resources: ['resources'] as const,
  badges: ['badges'] as const,
  practice: ['practice'] as const,
  storageUsage: ['storage-usage'] as const,
} as const;
