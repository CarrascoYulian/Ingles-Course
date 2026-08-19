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
  LessonComment,
  LessonNote,
  Module,
  ModuleQuiz,
  CourseRating,
  CourseRatingsSummary,
  CourseThread,
  CourseThreadReply,
  PracticeLevel,
  PracticeQuestion,
  PracticeSession,
  QuizAttempt,
  QuizDraft,
  ReportRange,
  ReportSnapshot,
  StorageUsage,
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
  /** Sólo para video: duración real leída del archivo antes de subirlo. */
  durationSeconds?: number;
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
  /** Título/descripción reales de la lección creada por un video subido. */
  updateLesson(lessonId: string, input: { title: string; description: string }): Promise<void>;
}

export interface CreateStudentInput {
  fullName: string;
  level: CefrLevel;
  /** PIN de 4 dígitos: el alumno entra con su matrícula + este PIN. */
  pin: string;
}

export interface UpdateStudentInput {
  fullName: string;
  level: CefrLevel;
  /** Sólo se envía cuando el maestro quiere resetear el PIN; vacío = no tocar. */
  pin?: string;
}

export interface StudentsPort {
  list(filters: StudentFilters): Promise<PaginatedResult<StudentSummary>>;
  resetProgress(id: string): Promise<StudentSummary>;
  invite(input: CreateStudentInput): Promise<{ enrollmentCode: string }>;
  update(id: string, input: UpdateStudentInput): Promise<StudentSummary>;
  /** Borra al alumno de Auth y, en cascada, todos sus datos reales en Supabase. */
  remove(id: string): Promise<void>;
  sendMessage(id: string, body: string): Promise<void>;
  /** Matricula al alumno en un curso y le otorga acceso a los módulos indicados (al menos uno). */
  enroll(studentId: string, courseId: string, moduleIds: string[]): Promise<void>;
  /** Pausa/reactiva al alumno: inactivo no puede iniciar sesión ni mantener una sesión abierta. */
  setActive(id: string, active: boolean): Promise<StudentSummary>;
  /** Cursos en los que el alumno ya está matriculado — para elegir a cuál darle acceso a más módulos. */
  listEnrollments(studentId: string): Promise<{ courseId: string; courseName: string }[]>;
  /** Ids de los módulos de ese curso a los que el alumno ya tiene acceso otorgado. */
  getModuleAccess(studentId: string, courseId: string): Promise<string[]>;
  /** Reemplaza el conjunto de módulos otorgados de ese curso — no matricula, sólo ajusta el acceso. */
  setModuleAccess(studentId: string, courseId: string, moduleIds: string[]): Promise<void>;
}

export interface AnalyticsPort {
  getMetrics(): Promise<DashboardMetrics>;
  getActivity(): Promise<ActivityEvent[]>;
  getLeaderboard(): Promise<LeaderboardEntry[]>;
  getReport(range: ReportRange): Promise<ReportSnapshot>;
  /** Sólo docente — promedio + reseñas de un curso, nunca de qué alumno es cada una. */
  getCourseRatings(courseId: string): Promise<CourseRatingsSummary>;
}

export interface CreateModuleInput {
  courseId: string;
  title: string;
}

export interface StudentMessage {
  id: string;
  body: string;
  createdAt: string;
  fromStaff: boolean;
  readAt: string | null;
}

export interface LearningPort {
  /** Cursos en los que está matriculado el alumno autenticado, más reciente primero. */
  getMyCourses(): Promise<Course[]>;
  /** `null` cuando el curso aún no tiene ningún módulo real — no cae a un módulo de ejemplo. */
  getCurrentModule(courseId: string): Promise<Module | null>;
  listLessons(moduleId: string): Promise<Lesson[]>;
  /** URL firmada del video real de una lección — `null` si no tiene o no existe. */
  getLessonVideoUrl(mediaKey: string): Promise<string | null>;
  /**
   * Sin filtros: todo el material de todos los cursos matriculados (lo usa
   * la biblioteca en `/recursos`). Con `courseId`/`moduleId`: sólo el
   * material real de esa lección — antes cualquier curso/módulo traía
   * también los archivos subidos en otros cursos y otros módulos, porque
   * el filtro sólo miraba "¿está matriculado en ALGÚN curso?".
   */
  listResources(filters?: { courseId?: string; moduleId?: string }): Promise<CourseResource[]>;
  listBadges(): Promise<Badge[]>;
  /** Persiste el avance de reproducción de una lección (0-100). */
  saveWatchedPercent(lessonId: string, percent: number): Promise<void>;
  /**
   * Progreso agregado del alumno autenticado en UN curso concreto — nunca el
   * de otro usuario. Antes no recibía `courseId` y tomaba la matrícula MÁS
   * RECIENTE del alumno sin importar cuál: con más de un curso, terminar
   * módulos enteros de un curso podía seguir mostrando "0 %" si esa no era
   * la última matrícula creada.
   */
  getMyProgress(courseId: string): Promise<StudentProgress>;
  /** Crea el primer/siguiente módulo de un curso desde el panel — sin SQL manual. */
  createModule(input: CreateModuleInput): Promise<Module>;
  /** Notas reales del alumno autenticado sobre una lección, con marca de tiempo del video. */
  listNotes(lessonId: string): Promise<LessonNote[]>;
  addNote(lessonId: string, body: string, timestampSeconds: number): Promise<LessonNote>;
  /** Mensajes que el equipo docente le ha enviado al alumno autenticado. */
  getMyMessages(): Promise<StudentMessage[]>;
  markMessageRead(id: string): Promise<void>;
  /** Responde al docente — antes la bandeja era de sólo lectura. */
  sendMyMessage(body: string): Promise<void>;
  /** Comentarios reales de una lección — visibles para el alumno y el docente por igual. */
  listComments(lessonId: string): Promise<LessonComment[]>;
  /**
   * El autor (alumno o docente) se resuelve del usuario autenticado, nunca
   * se recibe como parámetro. `parentId` lo convierte en una respuesta a
   * ese comentario en vez de uno nuevo de primer nivel.
   */
  addComment(lessonId: string, body: string, parentId?: string): Promise<LessonComment>;
  /** El alumno sólo puede borrar el suyo; el docente, cualquiera — lo aplica RLS. */
  deleteComment(commentId: string): Promise<void>;
  /** `null` = nunca los vio. Marca desde cuándo son "nuevos" los comentarios de esa lección para el usuario autenticado. */
  getCommentsLastSeen(lessonId: string): Promise<string | null>;
  /** Actualiza esa marca a "ahora" — se llama al abrir la pestaña de comentarios. */
  markCommentsSeen(lessonId: string): Promise<void>;
  /** `null` = el módulo no tiene evaluación. Nunca trae preguntas/opciones. */
  getModuleQuiz(moduleId: string): Promise<ModuleQuiz | null>;
  /** Historial de intentos del alumno autenticado en ese quiz, más reciente primero. */
  listMyQuizAttempts(quizId: string): Promise<QuizAttempt[]>;
  /** Temas del foro de un curso, más reciente primero. */
  listCourseThreads(courseId: string): Promise<CourseThread[]>;
  getCourseThread(threadId: string): Promise<CourseThread | null>;
  listThreadReplies(threadId: string): Promise<CourseThreadReply[]>;
  createCourseThread(courseId: string, title: string, body: string): Promise<CourseThread>;
  addThreadReply(threadId: string, body: string): Promise<CourseThreadReply>;
  /** El alumno sólo puede borrar el suyo; el docente, cualquiera — lo aplica RLS. */
  deleteCourseThread(threadId: string): Promise<void>;
  deleteThreadReply(replyId: string): Promise<void>;
  /** `null` = el alumno autenticado todavía no calificó ese curso. */
  getMyCourseRating(courseId: string): Promise<CourseRating | null>;
  /** Crea o actualiza (una calificación por alumno por curso). */
  submitCourseRating(courseId: string, stars: number, review: string): Promise<void>;
}

export interface QuizPort {
  /** Autoría del docente — incluye `isCorrect`. `null` si el módulo no tiene quiz todavía. */
  getQuizDraft(moduleId: string): Promise<QuizDraft | null>;
  /** Reemplaza el quiz completo del módulo (preguntas y opciones incluidas). */
  saveQuizDraft(moduleId: string, draft: QuizDraft): Promise<void>;
  /** Borra el quiz del módulo entero, con sus preguntas, opciones e intentos. */
  removeQuiz(moduleId: string): Promise<void>;
}

export interface PracticePort {
  getSession(): Promise<PracticeSession>;
  listLevels(): Promise<PracticeLevel[]>;
  getQuestion(step: number): Promise<PracticeQuestion>;
  submitAnswer(questionId: string, optionId: string): Promise<AnswerResult>;
  advance(): Promise<PracticeSession>;
}

export interface StoragePort {
  /** Uso real del bucket de archivos, contra el límite del plan contratado. */
  getUsage(): Promise<StorageUsage>;
}

export interface Backend {
  courses: CoursesPort;
  content: ContentPort;
  students: StudentsPort;
  analytics: AnalyticsPort;
  learning: LearningPort;
  practice: PracticePort;
  storage: StoragePort;
  quiz: QuizPort;
}
