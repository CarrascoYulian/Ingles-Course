/**
 * Puertos (interfaces) de la capa de datos.
 *
 * Los componentes y hooks dependen SÓLO de estos contratos, nunca de
 * Supabase. Eso permite dos adaptadores intercambiables — `demo` (memoria) y
 * `supabase` (Postgres) — y hace el dominio testeable sin red.
 */

import type {
  ActivityEvent,
  Assignment,
  AssignmentSubmission,
  Badge,
  BlockType,
  CefrLevel,
  Course,
  DashboardMetrics,
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
  StudentPerformanceSummary,
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

/**
 * Editor de módulos. Opera sobre `Lesson` — la misma fila que lee
 * `LearningPort.listLessons` del lado del alumno, en el mismo orden: ya no
 * hay una tabla de "bloques" separada de las lecciones que ve el alumno.
 */
export interface ContentPort {
  getModule(moduleId: string): Promise<Module>;
  /** Todos los módulos de un curso, en orden — permite navegar entre varios. */
  listModules(courseId: string): Promise<Module[]>;
  listBlocks(moduleId: string): Promise<Lesson[]>;
  addBlock(moduleId: string, type: BlockType): Promise<Lesson>;
  moveBlock(moduleId: string, blockId: string, direction: -1 | 1): Promise<Lesson[]>;
  removeBlock(blockId: string): Promise<void>;
  /**
   * Registra en la base de datos un archivo que ya terminó de subirse a
   * Storage: crea el ítem con su `media_key`, quién lo subió y cuándo.
   */
  attachUpload(input: AttachUploadInput): Promise<Lesson>;
  /** URL firmada para confirmar que el archivo existe y abrirlo. */
  getFileUrl(mediaKey: string): Promise<string | null>;
  /** Título/descripción reales del ítem — para cualquier tipo, no sólo video. */
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
  getReport(range: ReportRange): Promise<ReportSnapshot>;
  /** Sólo docente — promedio + reseñas de un curso, nunca de qué alumno es cada una. */
  getCourseRatings(courseId: string): Promise<CourseRatingsSummary>;
  /** Rendimiento/calificaciones acumuladas por alumno — sólo dentro del módulo de Reportes. */
  getStudentPerformance(filters: StudentFilters): Promise<PaginatedResult<StudentPerformanceSummary>>;
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
  listBadges(): Promise<Badge[]>;
  /** Persiste el avance de reproducción de una lección (0-100). */
  saveWatchedPercent(lessonId: string, percent: number): Promise<void>;
  /**
   * Marca un ítem sin reproductor (PDF/Audio/Ejercicio) como visto en cuanto
   * el alumno llega a él — equivalente a `saveWatchedPercent(id, 100)`, sin
   * exigir ninguna acción explícita. La `Evaluación` queda fuera de esto:
   * su avance lo decide aprobar el quiz, no llegar al ítem.
   */
  markLessonViewed(lessonId: string): Promise<void>;
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
  /** Tareas de todos los módulos a los que el alumno tiene acceso en ese curso. */
  listMyAssignments(courseId: string): Promise<Assignment[]>;
  /** `null` = el alumno autenticado todavía no entregó esa tarea. */
  getMySubmission(assignmentId: string): Promise<AssignmentSubmission | null>;
  /** El archivo ya debe haber pasado por `uploadFile()`/`/api/uploads` antes de llamar esto. */
  submitAssignment(
    assignmentId: string,
    input: { kind: 'file' | 'audio'; mediaKey: string; fileName: string },
  ): Promise<AssignmentSubmission>;
  /** Borra la propia entrega para poder resubir — rechazado si ya venció o fue calificada. */
  deleteMySubmission(submissionId: string): Promise<void>;
}

export interface QuizPort {
  /** Autoría del docente — incluye `isCorrect`. `null` si el módulo no tiene quiz todavía. */
  getQuizDraft(moduleId: string): Promise<QuizDraft | null>;
  /** Reemplaza el quiz completo del módulo (preguntas y opciones incluidas). */
  saveQuizDraft(moduleId: string, draft: QuizDraft): Promise<void>;
  /** Borra el quiz del módulo entero, con sus preguntas, opciones e intentos. */
  removeQuiz(moduleId: string): Promise<void>;
}

export interface CreateAssignmentInput {
  moduleId: string;
  title: string;
  instructions: string;
  dueAt: string;
  /**
   * `undefined` = no tocar el adjunto existente (sólo relevante en
   * `updateAssignment`; en `createAssignment` equivale a "sin adjunto").
   * `null` = quitar explícitamente el adjunto. Objeto = reemplazarlo.
   */
  attachment?: { mediaKey: string; fileName: string; contentType: string } | null;
}

/**
 * Autoría docente — análogo a `QuizPort`, separado de `LearningPort` por la
 * misma razón: acá el docente ve las entregas de TODOS los alumnos, algo
 * que el propio `LearningPort` (lado alumno) nunca expone.
 */
export interface AssignmentPort {
  listAssignments(moduleId: string): Promise<Assignment[]>;
  createAssignment(input: CreateAssignmentInput): Promise<Assignment>;
  updateAssignment(id: string, input: Omit<CreateAssignmentInput, 'moduleId'>): Promise<Assignment>;
  /** Borra la tarea y, en cascada, todas sus entregas. */
  removeAssignment(id: string): Promise<void>;
  /**
   * TODAS las entregas de TODAS las tareas de un módulo, en una sola
   * consulta — la vista docente filtra client-side por `assignmentId` para
   * mostrar tanto los contadores de cada fila (siempre correctos, no sólo
   * los de la tarea expandida) como la tabla por alumno al expandir una.
   * Antes se pedía por tarea sólo bajo demanda (`listSubmissionsForAssignment`),
   * así que toda fila colapsada mostraba "0 entregas" aunque tuviera
   * entregas reales.
   */
  listSubmissionsForModule(moduleId: string): Promise<AssignmentSubmission[]>;
  gradeSubmission(submissionId: string, grade: number, feedback: string): Promise<AssignmentSubmission>;
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
  assignments: AssignmentPort;
}
