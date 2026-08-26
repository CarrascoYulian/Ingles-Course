/**
 * Modelo de dominio. Es la única forma que conocen los componentes:
 * la capa `services/` traduce filas de Supabase (snake_case) a estos tipos.
 */

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export const USER_ROLES = ['admin', 'instructor', 'student'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const BLOCK_TYPES = ['Video', 'PDF', 'Ejercicio', 'Audio', 'Evaluación'] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const LESSON_STATES = ['done', 'current', 'locked'] as const;
export type LessonState = (typeof LESSON_STATES)[number];

export interface Profile {
  id: string;
  role: UserRole;
  fullName: string;
  /** Matrícula visible al usuario, p. ej. ING-000072. */
  enrollmentCode: string | null;
  level: CefrLevel | null;
  avatarColor: string | null;
}

export interface Course {
  id: string;
  name: string;
  level: CefrLevel;
  /** Nº de estudiantes matriculados (agregado). */
  students: number;
  /** Avance medio 0-100 (agregado). */
  progress: number;
  modules: number;
  published: boolean;
  position: number;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  position: number;
  /** Módulo que debe completarse antes de abrir éste. */
  requiresModuleId: string | null;
}

/**
 * Ítem de contenido de un módulo — construido por el docente en el editor y
 * recorrido por el alumno en ese mismo orden, sin importar el tipo. Antes
 * `ContentBlock` (editor) y `Lesson` (progreso del alumno) eran dos tablas
 * separadas sin FK, unidas sólo por `mediaKey`; ahora son la misma fila.
 */
export interface Lesson {
  id: string;
  moduleId: string;
  order: number;
  type: BlockType;
  title: string;
  /** Texto ya formateado para la UI: "14 min · 1080p", "820 KB"… */
  meta: string;
  /** Duración legible: "14 min" o "0:06" si dura menos de un minuto — sólo tiene sentido para `type: 'Video'`. */
  duration: string;
  /** Duración real en segundos — nunca redondeada hacia arriba. */
  durationSeconds: number;
  state: LessonState;
  /** 0-100. Avance real de reproducción guardado para el usuario actual. */
  watchedPercent: number;
  /**
   * Ruta del objeto en Supabase Storage (bucket `course-files`). La base de
   * datos NO guarda binarios, sólo esta referencia; la URL se firma en el
   * servidor bajo demanda. `null` si aún no se adjuntó ningún archivo.
   */
  mediaKey: string | null;
  /** Escrita por el docente — `null` si todavía no le puso ninguna. */
  description: string | null;
  /** Quién subió el archivo y cuándo — `null` en ítems creados sin archivo (p. ej. "Ejercicio"). */
  uploadedBy: string | null;
}

export interface LessonNote {
  id: string;
  lessonId: string;
  body: string;
  /** Segundo del video en el que se tomó la nota. */
  timestampSeconds: number;
  createdAt: string;
}

/** Comentario real de un alumno o del docente sobre una lección — visible para ambos. */
export interface LessonComment {
  id: string;
  lessonId: string;
  authorId: string;
  authorName: string;
  fromStaff: boolean;
  body: string;
  createdAt: string;
  /** `null` = comentario de primer nivel; con valor = respuesta a ese comentario. */
  parentId: string | null;
}

/**
 * Metadata segura del quiz de un módulo — nunca incluye preguntas ni
 * opciones. El alumno la usa para saber "¿este módulo tiene evaluación?" sin
 * poder ver la clave de respuestas.
 */
export interface ModuleQuiz {
  id: string;
  moduleId: string;
  passingScore: number;
  questionCount: number;
}

export interface QuizAttempt {
  id: string;
  score: number;
  passed: boolean;
  createdAt: string;
}

/** Pregunta tal como la ve el alumno al TOMAR el quiz — sin `isCorrect`. */
export interface QuizQuestionForStudent {
  id: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
}

/** Versión completa (con `isCorrect`) que sólo usa la autoría del docente. */
export interface QuizOptionDraft {
  label: string;
  isCorrect: boolean;
}

export interface QuizQuestionDraft {
  prompt: string;
  options: QuizOptionDraft[];
}

export interface QuizDraft {
  passingScore: number;
  questions: QuizQuestionDraft[];
}

/** Estado visible de una tarea, combinando fecha límite + calificación. */
export type AssignmentStatus = 'pending' | 'submitted' | 'graded' | 'overdue';

/**
 * La consigna de una tarea — separada de `Lesson`: no participa de la
 * secuencia de contenido del módulo, vive en su propia sección "Tareas".
 */
export interface Assignment {
  id: string;
  moduleId: string;
  title: string;
  instructions: string;
  /** Adjunto opcional del docente (ej. una plantilla o material de referencia). */
  mediaKey: string | null;
  fileName: string | null;
  dueAt: string;
  createdAt: string;
}

/**
 * Entrega de un alumno. `studentName` sólo viene poblado en las lecturas del
 * docente (tabla por alumno); el propio alumno ya sabe quién es.
 */
export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName?: string;
  kind: 'file' | 'audio';
  mediaKey: string;
  fileName: string;
  submittedAt: string;
  grade: number | null;
  feedback: string | null;
  gradedAt: string | null;
}

/** Tema del foro DEL CURSO — separado de `LessonComment`, que es por lección. */
export interface CourseThread {
  id: string;
  courseId: string;
  authorId: string;
  authorName: string;
  fromStaff: boolean;
  title: string;
  body: string;
  createdAt: string;
  replyCount: number;
}

export interface CourseThreadReply {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  fromStaff: boolean;
  body: string;
  createdAt: string;
}

/** Lo que el propio alumno calificó — `null` = todavía no calificó este curso. */
export interface CourseRating {
  stars: number;
  review: string | null;
}

/** Sólo para el docente: nunca expone qué alumno escribió qué (feedback interno). */
export interface CourseRatingsSummary {
  average: number | null;
  count: number;
  reviews: Array<{ stars: number; review: string | null; createdAt: string }>;
}

/** Progreso agregado del alumno que hace la petición — nunca de otro usuario. */
export interface StudentProgress {
  percent: number;
  level: CefrLevel;
  hoursStudied: number;
  lessonsCompleted: number;
  badgesEarned: number;
}

export interface StudentSummary {
  id: string;
  enrollmentCode: string;
  name: string;
  level: CefrLevel;
  /** 0-100 */
  progress: number;
  hours: number;
  lessons: number;
  active: boolean;
  avatarColor: string;
}

export interface Badge {
  id: string;
  name: string;
  /** Texto de estado: "Obtenida", "Faltan 18 días"… */
  state: string;
  earned: boolean;
}

export interface ActivityEvent {
  id: string;
  tone: 'success' | 'info' | 'warning' | 'danger';
  /** Segmentos: los marcados `strong` se resaltan en la UI. */
  segments: Array<{ text: string; strong?: boolean }>;
  timeAgo: string;
}

export interface StudentPerformanceSummary {
  id: string;
  name: string;
  enrollmentCode: string;
  level: CefrLevel;
  avatarColor: string;
  /** Promedio de `quiz_attempts.score`; `null` si el alumno no tiene intentos. */
  avgScore: number | null;
  /** % de intentos con `passed = true`; `null` si el alumno no tiene intentos. */
  passRate: number | null;
  attempts: number;
  /** ISO del intento más reciente del alumno; `null` si no tiene ninguno. */
  lastAttemptAt: string | null;
}

export interface DashboardMetrics {
  activeStudents: { value: number; deltaLabel: string; ratio: number; caption: string };
  averageProgress: { value: number; deltaLabel: string; caption: string };
  watchedHours: { value: string; deltaLabel: string; sparkline: number[] };
  library: { courses: number; modules: number; videos: number; drafts: number };
  weeklyLessons: Array<{ label: string; current: number; previous: number }>;
  /** Total real de estudiantes matriculados (activos + inactivos). */
  totalStudents: number;
}

/**
 * Uso real del bucket `course-files` — issue #39 (Fase 3).
 * `tier` ya viene calculado del servidor (umbrales en `src/lib/storage.ts`)
 * para que el widget no tenga que duplicar los cortes de 65 %/90 % — sólo
 * elige el color.
 */
export interface StorageUsage {
  usedBytes: number;
  limitBytes: number;
  usedPercent: number;
  tier: 'ok' | 'warning' | 'critical';
  /** Desglose por curso, de mayor a menor uso — para saber qué curso "pesa" si hay que liberar espacio. */
  byCourse: StorageUsageByCourse[];
}

export interface StorageUsageByCourse {
  courseId: string;
  courseName: string;
  bytes: number;
}

export type ReportRange = '7 días' | '30 días' | 'Trimestre' | 'Año';

export interface ReportSnapshot {
  range: ReportRange;
  bars: number[];
  retention: { value: string; delta: string };
  dropOff: { lesson: string; rate: string };
  recommendation: string;
}

export interface PracticeOption {
  id: string;
  key: 'A' | 'B' | 'C' | 'D';
  text: string;
  /** Texto abreviado para móvil (el diseño trunca las opciones largas). */
  shortText?: string;
}

export interface PracticeQuestion {
  id: string;
  category: string;
  xpReward: number;
  prompt: string;
  sourceText: string;
  audioKey: string | null;
  options: PracticeOption[];
  /**
   * Sólo presente en servidor y en modo demo. La API pública lo omite: si
   * viajara al navegador, la respuesta sería visible en las DevTools antes
   * de contestar. La corrección la hace `submitAnswer`.
   */
  correctOptionId?: string;
  explanationCorrect: string;
  explanationWrong: string;
}

export interface PracticeLevel {
  id: string;
  order: number;
  title: string;
  state: 'done' | 'current' | 'locked';
  xp: number | null;
  totalSteps: number;
  completedSteps: number;
}

export interface PracticeSession {
  levelId: string;
  step: number;
  totalSteps: number;
  xp: number;
  coins: number;
  streak: number;
  hearts: { total: number; remaining: number };
  missions: PracticeMissions;
}

/**
 * Meta diaria de XP, racha de los últimos 7 días y próxima insignia.
 * Antes de existir esto, "Misión de hoy" mostraba 45/60 XP y "3 de 5 días"
 * fijos en el JSX, iguales para cualquier alumno en cualquier momento.
 */
export interface PracticeMissions {
  dailyXp: { earned: number; goal: number };
  weeklyStreak: { done: number; total: number };
  nextBadge: { name: string; requirement: string } | null;
}
