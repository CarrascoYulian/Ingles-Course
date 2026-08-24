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
  studentPerformance: (filters?: unknown) => ['student-performance', filters ?? {}] as const,
  studentEnrollments: (studentId: string) => ['student-enrollments', studentId] as const,
  moduleAccess: (studentId: string, courseId: string) => ['module-access', studentId, courseId] as const,
  dashboard: ['dashboard'] as const,
  report: (range: string) => ['report', range] as const,
  lessons: (moduleId: string) => ['lessons', moduleId] as const,
  badges: ['badges'] as const,
  practice: ['practice'] as const,
  storageUsage: ['storage-usage'] as const,
  assignments: (moduleId: string) => ['assignments', moduleId] as const,
  moduleSubmissions: (moduleId: string) => ['module-submissions', moduleId] as const,
  myAssignments: (courseId: string) => ['my-assignments', courseId] as const,
  mySubmission: (assignmentId: string) => ['my-submission', assignmentId] as const,
} as const;
