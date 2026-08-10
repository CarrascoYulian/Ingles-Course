/**
 * Puertos (interfaces) de la capa de datos.
 *
 * Los componentes y hooks dependen SÓLO de estos contratos, nunca de
 * Supabase. Eso permite dos adaptadores intercambiables — `demo` (memoria) y
 * `supabase` (Postgres) — y hace el dominio testeable sin red.
 */

import type {
  ActivityEvent,
  Badge,
  BlockType,
  CefrLevel,
  ContentBlock,
  Course,
  CourseResource,
  DashboardMetrics,
  LeaderboardEntry,
  Lesson,
  Module,
  PracticeLevel,
  PracticeQuestion,
  PracticeSession,
  ReportRange,
  ReportSnapshot,
  StudentProgress,
  StudentSummary,
} from '@/types';

export interface CreateCourseInput {
  name: string;
  level: CefrLevel;
}

export interface StudentFilters {
  query?: string;
  level?: CefrLevel | 'Todos';
  /** 1-indexado. */
  page?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AnswerResult {
  correct: boolean;
  xpGained: number;
  explanation: string;
  /** Se revela sólo tras contestar, para poder marcar la opción acertada. */
  correctOptionId: string;
}

export interface CoursesPort {
  list(): Promise<Course[]>;
  create(input: CreateCourseInput): Promise<Course>;
  update(id: string, input: CreateCourseInput): Promise<Course>;
  setPublished(id: string, published: boolean): Promise<Course>;
  remove(id: string): Promise<void>;
  /** Intercambia la posición del curso con la del vecino inmediato. */
  reorder(id: string, direction: -1 | 1): Promise<Course[]>;
}

export interface AttachUploadInput {
  moduleId: string;
  mediaKey: string;
  fileName: string;
  contentType: string;
  /** Bytes, ya formateados a texto legible ("4,2 MB") por el llamante. */
  sizeLabel: string;
}

export interface ContentPort {
  getModule(moduleId: string): Promise<Module>;
  /** Todos los módulos de un curso, en orden — permite navegar entre varios. */
  listModules(courseId: string): Promise<Module[]>;
  listBlocks(moduleId: string): Promise<ContentBlock[]>;
  addBlock(moduleId: string, type: BlockType): Promise<ContentBlock>;
  moveBlock(moduleId: string, blockId: string, direction: -1 | 1): Promise<ContentBlock[]>;
  removeBlock(blockId: string): Promise<void>;
  /**
   * Registra en la base de datos un archivo que ya terminó de subirse a
   * Storage: crea el bloque con su `media_key`, quién lo subió y cuándo.
   */
  attachUpload(input: AttachUploadInput): Promise<ContentBlock>;
  /** URL firmada para confirmar que el archivo existe y abrirlo. */
  getFileUrl(mediaKey: string): Promise<string | null>;
}

export interface CreateStudentInput {
  fullName: string;
  level: CefrLevel;
  /** Clave asignada por el maestro: el alumno entra con su matrícula + esta clave. */
  password: string;
}

export interface StudentsPort {
  list(filters: StudentFilters): Promise<PaginatedResult<StudentSummary>>;
  resetProgress(id: string): Promise<StudentSummary>;
  invite(input: CreateStudentInput): Promise<{ enrollmentCode: string }>;
  sendMessage(id: string, body: string): Promise<void>;
}

export interface AnalyticsPort {
  getMetrics(): Promise<DashboardMetrics>;
  getActivity(): Promise<ActivityEvent[]>;
  getLeaderboard(): Promise<LeaderboardEntry[]>;
  getReport(range: ReportRange): Promise<ReportSnapshot>;
}

export interface CreateModuleInput {
  courseId: string;
  title: string;
}

export interface LearningPort {
  /** Cursos en los que está matriculado el alumno autenticado, más reciente primero. */
  getMyCourses(): Promise<Course[]>;
  /** `null` cuando el curso aún no tiene ningún módulo real — no cae a un módulo de ejemplo. */
  getCurrentModule(courseId: string): Promise<Module | null>;
  listLessons(moduleId: string): Promise<Lesson[]>;
  /** URL firmada del video real de una lección — `null` si no tiene o no existe. */
  getLessonVideoUrl(mediaKey: string): Promise<string | null>;
  listResources(): Promise<CourseResource[]>;
  listBadges(): Promise<Badge[]>;
  /** Persiste el avance de reproducción de una lección (0-100). */
  saveWatchedPercent(lessonId: string, percent: number): Promise<void>;
  /** Progreso agregado del alumno autenticado: nunca el de otro usuario. */
  getMyProgress(): Promise<StudentProgress>;
  /** Crea el primer/siguiente módulo de un curso desde el panel — sin SQL manual. */
  createModule(input: CreateModuleInput): Promise<Module>;
}

export interface PracticePort {
  getSession(): Promise<PracticeSession>;
  listLevels(): Promise<PracticeLevel[]>;
  getQuestion(step: number): Promise<PracticeQuestion>;
  submitAnswer(questionId: string, optionId: string): Promise<AnswerResult>;
  advance(): Promise<PracticeSession>;
}

export interface Backend {
  courses: CoursesPort;
  content: ContentPort;
  students: StudentsPort;
  analytics: AnalyticsPort;
  learning: LearningPort;
  practice: PracticePort;
}
