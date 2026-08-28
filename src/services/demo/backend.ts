import { inferBlockType } from '@/features/content/infer-block-type';
import { canStudentDelete, canStudentSubmit } from '@/features/assignments/submission-rules';
import type { AttachUploadInput, Backend, CreateAssignmentInput } from '../ports';
import {
  DEMO_ACTIVITY,
  DEMO_ASSIGNMENT,
  DEMO_BADGES,
  DEMO_COURSES,
  DEMO_LESSONS,
  DEMO_METRICS,
  DEMO_MODULE,
  DEMO_PRACTICE_LEVELS,
  DEMO_QUESTION,
  DEMO_QUIZ_DRAFT,
  DEMO_QUIZ_ID,
  DEMO_REPORT_BARS,
  DEMO_STUDENT,
  DEMO_STUDENT_PERFORMANCE,
  DEMO_STUDENTS,
  DEMO_TEACHER,
} from './data';
import type {
  Assignment,
  AssignmentSubmission,
  AuditLogEntry,
  Badge,
  BlockType,
  Course,
  CourseRating,
  CourseRatingsSummary,
  CourseThread,
  CourseThreadReply,
  Lesson,
  LessonComment,
  LessonNote,
  PracticeSession,
  QuizAttempt,
  QuizDraft,
  ReportRange,
  StaffMember,
  StudentPerformanceSummary,
  StudentSummary,
} from '@/types';

const demoNotes: LessonNote[] = [];
const demoComments: LessonComment[] = [];
const demoQuizAttempts: Array<QuizAttempt & { quizId: string }> = [];
const demoThreads: CourseThread[] = [];
const demoThreadReplies: CourseThreadReply[] = [];
const demoRatings = new Map<string, CourseRating>();
// `null` = el quiz de referencia se borró desde el panel; `undefined` nunca
// se usa como estado real, sólo como valor inicial antes de leerlo.
let demoQuizDraft: QuizDraft | null = structuredClone(DEMO_QUIZ_DRAFT);
let demoAssignments: Assignment[] = [structuredClone(DEMO_ASSIGNMENT)];
let demoSubmissions: AssignmentSubmission[] = [];
let demoStaff: StaffMember[] = [
  {
    id: DEMO_TEACHER.id,
    fullName: DEMO_TEACHER.fullName,
    email: 'docente@ejemplo.com',
    role: 'admin',
    isActive: true,
    isSuperAdmin: true,
    createdAt: new Date().toISOString(),
  },
];
const demoAuditLog: AuditLogEntry[] = [];

/**
 * El propio `Backend` no expone un método de "enviar intento": la
 * calificación real vive en las rutas API (`/api/quizzes/[moduleId]/attempt`)
 * para no mandar `isCorrect` al navegador — ver la migración
 * `0032_module_quizzes.sql`. En modo demo esa misma ruta llama a esta
 * función para que el intento quede en el mismo store que lee
 * `learning.listMyQuizAttempts`, en vez de llevar su propio duplicado.
 */
export function recordDemoQuizAttempt(quizId: string, score: number, passed: boolean): QuizAttempt {
  const attempt: QuizAttempt & { quizId: string } = {
    id: crypto.randomUUID(),
    quizId,
    score,
    passed,
    createdAt: new Date().toISOString(),
  };
  demoQuizAttempts.push(attempt);
  const { quizId: _quizId, ...rest } = attempt;
  return rest;
}

/** El quiz de referencia en demo, con `isCorrect` — la ruta API lo usa para calificar. */
export function getDemoQuizDraft(moduleId: string): QuizDraft | null {
  return moduleId === DEMO_MODULE.id ? demoQuizDraft : null;
}

/**
 * Adaptador en memoria. Reproduce toda la lógica del prototipo (crear curso,
 * publicar, reordenar bloques, reiniciar progreso, corregir ejercicio) para
 * que la interfaz sea plenamente navegable sin infraestructura.
 */

interface DemoStore {
  courses: Course[];
  lessons: Lesson[];
  students: StudentSummary[];
  session: PracticeSession;
  /** `"${studentId}:${courseId}"` → ids de módulo otorgados. El fixture sólo
   * modela un módulo por curso (`DEMO_MODULE`), así que en la práctica esto
   * es "tiene o no tiene" acceso al único módulo del curso. */
  moduleAccess: Map<string, Set<string>>;
}

const store: DemoStore = {
  courses: structuredClone(DEMO_COURSES),
  lessons: structuredClone(DEMO_LESSONS),
  students: structuredClone(DEMO_STUDENTS),
  moduleAccess: new Map(),
  session: {
    levelId: 'n3',
    step: 6,
    totalSteps: 10,
    xp: 1240,
    coins: 340,
    streak: 12,
    hearts: { total: 3, remaining: 1 },
    missions: {
      dailyXp: { earned: 45, goal: 60 },
      weeklyStreak: { done: 3, total: 7 },
      nextBadge: { name: 'Mil puntos', requirement: '260 XP más' },
    },
  },
};

/** Latencia simulada: hace visibles los estados de carga en desarrollo. */
const latency = <T>(value: T, ms = 120): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

const newId = () => `tmp-${Math.random().toString(36).slice(2, 10)}`;

const STUDENTS_PAGE_SIZE = 20;

const NEW_BLOCK_DEFAULTS: Record<BlockType, { title: string; meta: string }> = {
  Video: { title: 'Nuevo video sin título', meta: 'Pendiente de subir' },
  PDF: { title: 'Documento sin título', meta: 'Pendiente de subir' },
  Ejercicio: { title: 'Ejercicio sin título', meta: '0 preguntas' },
  Audio: { title: 'Audio sin título', meta: 'Pendiente de subir' },
  Evaluación: { title: 'Evaluación sin título', meta: '0 preguntas' },
};

export const demoBackend: Backend = {
  courses: {
    list: () => latency(structuredClone(store.courses)),

    create: ({ name, level }) => {
      const course: Course = {
        id: newId(),
        name,
        level,
        students: 0,
        progress: 0,
        modules: 0,
        published: false,
        archived: false,
        position: store.courses.length,
      };
      store.courses = [...store.courses, course];
      return latency(course);
    },

    update: (id, { name, level }) => {
      store.courses = store.courses.map((c) => (c.id === id ? { ...c, name, level } : c));
      const updated = store.courses.find((c) => c.id === id);
      if (!updated) throw new Error(`Curso ${id} no encontrado`);
      return latency(updated);
    },

    setPublished: (id, published) => {
      store.courses = store.courses.map((c) => (c.id === id ? { ...c, published } : c));
      const updated = store.courses.find((c) => c.id === id);
      if (!updated) throw new Error(`Curso ${id} no encontrado`);
      return latency(updated);
    },

    setArchived: (id, archived) => {
      store.courses = store.courses.map((c) => (c.id === id ? { ...c, archived } : c));
      const updated = store.courses.find((c) => c.id === id);
      if (!updated) throw new Error(`Curso ${id} no encontrado`);
      return latency(updated);
    },

    reorder: (id, direction) => {
      const from = store.courses.findIndex((c) => c.id === id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= store.courses.length) return latency(store.courses);

      const next = [...store.courses];
      [next[from], next[to]] = [next[to]!, next[from]!];
      store.courses = next.map((course, index) => ({ ...course, position: index }));
      return latency(structuredClone(store.courses));
    },

    remove: (id) => {
      store.courses = store.courses.filter((c) => c.id !== id);
      return latency(undefined);
    },

    getPublishWarnings: (courseId) => {
      if (DEMO_MODULE.courseId !== courseId) return latency([]);
      const empty = store.lessons.filter((l) => l.moduleId === DEMO_MODULE.id).length === 0;
      const missingQuiz = demoQuizDraft === null;
      if (!empty && !missingQuiz) return latency([]);
      return latency([{ moduleId: DEMO_MODULE.id, title: DEMO_MODULE.title, empty, missingQuiz }]);
    },
  },

  content: {
    getModule: () => latency(DEMO_MODULE),

    // El fixture en memoria sólo modela un módulo de referencia por curso.
    listModules: (courseId) =>
      latency(DEMO_MODULE.courseId === courseId ? [DEMO_MODULE] : []),

    updateModule: (moduleId, { title, requiresModuleId }) => {
      if (moduleId !== DEMO_MODULE.id) return Promise.reject(new Error('Unidad no encontrada'));
      // Mutación en el sitio del fixture — mismo patrón que `demoQuizDraft`.
      // El fixture sólo modela una unidad de referencia por curso, así que
      // `requiresModuleId` nunca tiene con qué unidad real vincularse — se
      // conserva de todos modos para que el formulario no truene.
      DEMO_MODULE.title = title;
      DEMO_MODULE.requiresModuleId = requiresModuleId;
      return latency({ ...DEMO_MODULE });
    },

    removeModule: () =>
      // El fixture sólo modela una unidad de referencia por curso: no hay
      // nada a lo que "reordenar" tras borrarla sin romper el resto del
      // mundo demo (quiz, tareas, progreso), que asumen que existe.
      Promise.reject(new Error('El modo demo no permite borrar la única unidad de referencia')),

    reorderModule: (moduleId) =>
      // Con un solo módulo por curso no hay vecino con quien intercambiar
      // posición — se devuelve la lista tal cual, igual que haría el swap
      // real cuando `from`/`to` caen fuera de rango.
      latency(moduleId === DEMO_MODULE.id ? [DEMO_MODULE] : []),

    duplicateModule: () =>
      // Mismo motivo que `removeModule`: el fixture sólo modela una unidad
      // de referencia por curso, y duplicar copia binarios reales en R2 vía
      // una ruta API que no tiene sentido sin Supabase configurado.
      Promise.reject(new Error('El modo demo no permite duplicar unidades')),

    listBlocks: (moduleId) =>
      latency(
        store.lessons
          .filter((l) => l.moduleId === moduleId)
          .map((l, index) => ({ ...l, order: index + 1 })),
      ),

    addBlock: (moduleId, type) => {
      const defaults = NEW_BLOCK_DEFAULTS[type];
      const lesson: Lesson = {
        id: newId(),
        moduleId,
        order: store.lessons.length + 1,
        type,
        title: defaults.title,
        meta: defaults.meta,
        duration: '',
        durationSeconds: 0,
        state: 'locked',
        watchedPercent: 0,
        mediaKey: null,
        description: null,
        transcript: null,
        uploadedBy: null,
      };
      store.lessons = [...store.lessons, lesson];
      return latency(lesson);
    },

    moveBlock: (moduleId, blockId, direction) => {
      const list = [...store.lessons];
      const from = list.findIndex((l) => l.id === blockId);
      const to = from + direction;
      if (from >= 0 && to >= 0 && to < list.length) {
        [list[from], list[to]] = [list[to]!, list[from]!];
        store.lessons = list;
      }
      return latency(
        store.lessons
          .filter((l) => l.moduleId === moduleId)
          .map((l, index) => ({ ...l, order: index + 1 })),
      );
    },

    removeBlock: (blockId) => {
      store.lessons = store.lessons.filter((l) => l.id !== blockId);
      return latency(undefined);
    },

    attachUpload: (input: AttachUploadInput) => {
      const type = inferBlockType(input.contentType);
      const lesson: Lesson = {
        id: newId(),
        moduleId: input.moduleId,
        order: store.lessons.length + 1,
        type,
        title: input.fileName,
        meta: input.sizeLabel,
        duration: type === 'Video' ? '0:00' : input.sizeLabel,
        durationSeconds: input.durationSeconds ? Math.round(input.durationSeconds) : 0,
        state: 'locked',
        watchedPercent: 0,
        mediaKey: input.mediaKey,
        description: null,
        transcript: null,
        uploadedBy: DEMO_TEACHER.id,
      };
      store.lessons = [...store.lessons, lesson];
      return latency(lesson);
    },

    // En modo demo el archivo vive de verdad en /public/demo-uploads (ver
    // upload.ts): no hay Storage real que firmar, así que se devuelve la
    // ruta servida por Next tal cual.
    getFileUrl: (mediaKey: string) => latency(`/demo-uploads/${mediaKey}`),
    updateLesson: (lessonId, input) => {
      store.lessons = store.lessons.map((l) =>
        l.id === lessonId
          ? { ...l, title: input.title, description: input.description || null, transcript: input.transcript || null }
          : l,
      );
      return latency(undefined);
    },

    // A diferencia de Supabase (donde el binario vive en R2 y hay que
    // copiarlo/borrarlo server-side), acá los "archivos" son un mero string
    // en memoria — reemplazar es simplemente pisar los campos de la fila.
    replaceLessonMedia: (lessonId, input) => {
      const type = inferBlockType(input.contentType);
      store.lessons = store.lessons.map((l) =>
        l.id === lessonId
          ? {
              ...l,
              type,
              meta: input.sizeLabel,
              duration: type === 'Video' ? '0:00' : input.sizeLabel,
              durationSeconds: input.durationSeconds ? Math.round(input.durationSeconds) : 0,
              mediaKey: input.mediaKey,
            }
          : l,
      );
      return latency(undefined);
    },

    listCourseMedia: (courseId) => {
      if (DEMO_MODULE.courseId !== courseId) return latency([]);
      return latency(
        store.lessons
          .filter((l) => l.moduleId === DEMO_MODULE.id && l.mediaKey)
          .map((l) => ({ lessonId: l.id, title: l.title, type: l.type, meta: l.meta, moduleTitle: DEMO_MODULE.title })),
      );
    },

    // El fixture no tiene R2 real que copiar — simular una copia clonando
    // la fila con un id nuevo (sin ref-count real, pero en memoria no hay
    // riesgo de que borrar una se lleve puesta la otra).
    addBlockFromLibrary: (moduleId, sourceLessonId) => {
      const source = store.lessons.find((l) => l.id === sourceLessonId);
      if (!source) return Promise.reject(new Error('Archivo no encontrado'));
      const lesson: Lesson = {
        ...source,
        id: newId(),
        moduleId,
        order: store.lessons.length + 1,
        state: 'locked',
        watchedPercent: 0,
      };
      store.lessons = [...store.lessons, lesson];
      return latency(undefined);
    },
  },

  students: {
    list: ({ query = '', level = 'Todos', page = 1 }) => {
      const needle = query.trim().toLowerCase();
      const filtered = store.students.filter((student) => {
        const matchesQuery =
          !needle ||
          student.name.toLowerCase().includes(needle) ||
          student.enrollmentCode.toLowerCase().includes(needle);
        const matchesLevel = level === 'Todos' || student.level === level;
        return matchesQuery && matchesLevel;
      });
      const pageSize = STUDENTS_PAGE_SIZE;
      const from = (page - 1) * pageSize;
      const items = filtered.slice(from, from + pageSize);
      return latency({ items: structuredClone(items), total: filtered.length, page, pageSize });
    },

    resetProgress: (id) => {
      store.students = store.students.map((s) =>
        s.id === id ? { ...s, progress: 0, lessons: 0, hours: 0 } : s,
      );
      const updated = store.students.find((s) => s.id === id);
      if (!updated) throw new Error(`Estudiante ${id} no encontrado`);
      return latency(updated);
    },

    invite: (_input) =>
      latency({ enrollmentCode: `ING-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}` }),

    update: (id, input) => {
      store.students = store.students.map((s) =>
        s.id === id ? { ...s, name: input.fullName, level: input.level } : s,
      );
      const updated = store.students.find((s) => s.id === id);
      if (!updated) throw new Error(`Estudiante ${id} no encontrado`);
      return latency(structuredClone(updated));
    },

    remove: (id) => {
      store.students = store.students.filter((s) => s.id !== id);
      return latency(undefined);
    },

    enroll: (studentId, courseId, moduleIds) => {
      store.moduleAccess.set(`${studentId}:${courseId}`, new Set(moduleIds));
      return latency(undefined);
    },

    sendMessage: () => latency(undefined),

    setActive: (id, active) => {
      store.students = store.students.map((s) => (s.id === id ? { ...s, active } : s));
      const updated = store.students.find((s) => s.id === id);
      if (!updated) throw new Error(`Estudiante ${id} no encontrado`);
      return latency(structuredClone(updated));
    },

    listEnrollments: (studentId) => {
      const entries = Array.from(store.moduleAccess.keys())
        .filter((key) => key.startsWith(`${studentId}:`))
        .map((key) => key.split(':')[1]!);
      return latency(
        entries
          .map((courseId) => store.courses.find((c) => c.id === courseId))
          .filter((c): c is Course => c !== undefined)
          .map((c) => ({ courseId: c.id, courseName: c.name })),
      );
    },

    getModuleAccess: (studentId, courseId) =>
      latency(Array.from(store.moduleAccess.get(`${studentId}:${courseId}`) ?? [])),

    setModuleAccess: (studentId, courseId, moduleIds) => {
      store.moduleAccess.set(`${studentId}:${courseId}`, new Set(moduleIds));
      return latency(undefined);
    },
  },

  analytics: {
    getMetrics: () => latency(DEMO_METRICS),
    getActivity: () => latency(DEMO_ACTIVITY),
    getStudentPerformance: ({ query = '', level = 'Todos', page = 1 }) => {
      const needle = query.trim().toLowerCase();
      const filtered = store.students.filter((student) => {
        const matchesQuery =
          !needle ||
          student.name.toLowerCase().includes(needle) ||
          student.enrollmentCode.toLowerCase().includes(needle);
        const matchesLevel = level === 'Todos' || student.level === level;
        return matchesQuery && matchesLevel;
      });
      const pageSize = STUDENTS_PAGE_SIZE;
      const from = (page - 1) * pageSize;
      const items: StudentPerformanceSummary[] = filtered.slice(from, from + pageSize).map((student) => {
        const performance = DEMO_STUDENT_PERFORMANCE[student.id];
        return {
          id: student.id,
          name: student.name,
          enrollmentCode: student.enrollmentCode,
          level: student.level,
          avatarColor: student.avatarColor,
          avgScore: performance?.avgScore ?? null,
          passRate: performance?.passRate ?? null,
          attempts: performance?.attempts ?? 0,
          lastAttemptAt: performance?.lastAttemptAt ?? null,
        };
      });
      return latency({ items, total: filtered.length, page, pageSize });
    },
    getReport: (range: ReportRange) =>
      latency({
        range,
        bars: DEMO_REPORT_BARS[range],
        retention: { value: '91 %', delta: '+2,4 pts vs. periodo anterior' },
        dropOff: { lesson: '4.8 Evaluación de la unidad', rate: '32 % la deja sin terminar' },
        recommendation:
          'Divide la evaluación 4.8 en dos partes: el abandono se concentra después del minuto 12.',
      }),
    getCourseRatings: (courseId: string): Promise<CourseRatingsSummary> => {
      const rating = demoRatings.get(courseId);
      return latency({
        average: rating ? rating.stars : null,
        count: rating ? 1 : 0,
        reviews: rating ? [{ stars: rating.stars, review: rating.review, createdAt: new Date().toISOString() }] : [],
      });
    },
  },

  learning: {
    getMyCourses: () => latency(store.courses.filter((c) => c.id === DEMO_MODULE.courseId)),
    getCurrentModule: (courseId) =>
      latency(courseId === DEMO_MODULE.courseId ? DEMO_MODULE : null),
    listLessons: (): Promise<Lesson[]> => latency(store.lessons),
    // El modo demo no tiene Storage real: ninguna lección de referencia
    // tiene `mediaKey`, así que esta ruta nunca llega a llamarse en la
    // práctica — se deja implementada por completar el contrato.
    getLessonVideoUrl: () => latency(null),
    listBadges: (): Promise<Badge[]> => latency(DEMO_BADGES),
    saveWatchedPercent: () => latency(undefined, 0),
    markLessonViewed: () => latency(undefined, 0),
    // Fixture único en memoria: no hay varios cursos entre los que
    // distinguir, así que `courseId` no tiene nada real que acotar aquí.
    getMyProgress: () =>
      latency({
        percent: 54,
        level: 'B1' as const,
        hoursStudied: 18,
        lessonsCompleted: 41,
        badgesEarned: DEMO_BADGES.filter((b) => b.earned).length,
      }),
    // En demo ya existe un único módulo de referencia; crear "otro" no tendría
    // dónde vivir en el fixture en memoria, así que se devuelve el mismo.
    createModule: ({ title }) => latency({ ...DEMO_MODULE, title }),
    listNotes: (lessonId: string) => latency(demoNotes.filter((n) => n.lessonId === lessonId)),
    addNote: (lessonId: string, body: string, timestampSeconds: number) => {
      const note = {
        id: crypto.randomUUID(),
        lessonId,
        body,
        timestampSeconds: Math.round(timestampSeconds),
        createdAt: new Date().toISOString(),
      };
      demoNotes.push(note);
      return latency(note);
    },
    getMyMessages: () => latency([]),
    markMessageRead: () => latency(undefined),
    sendMyMessage: () => latency(undefined),
    listComments: (lessonId: string) => latency(demoComments.filter((c) => c.lessonId === lessonId)),
    addComment: (lessonId: string, body: string, parentId?: string) => {
      const comment: LessonComment = {
        id: crypto.randomUUID(),
        lessonId,
        authorId: DEMO_TEACHER.id,
        authorName: DEMO_TEACHER.fullName,
        fromStaff: true,
        body,
        createdAt: new Date().toISOString(),
        parentId: parentId ?? null,
      };
      demoComments.push(comment);
      return latency(comment);
    },
    deleteComment: (commentId: string) => {
      const index = demoComments.findIndex((c) => c.id === commentId);
      if (index !== -1) demoComments.splice(index, 1);
      return latency(undefined);
    },
    // Modo demo: un solo usuario simulado, no hay "otra persona" cuyo
    // comentario nuevo detectar — no hace falta persistir nada real.
    getCommentsLastSeen: () => latency(null),
    markCommentsSeen: () => latency(undefined),
    getModuleQuiz: (moduleId: string) =>
      latency(
        moduleId === DEMO_MODULE.id && demoQuizDraft
          ? {
              id: DEMO_QUIZ_ID,
              moduleId,
              passingScore: demoQuizDraft.passingScore,
              questionCount: demoQuizDraft.questions.length,
            }
          : null,
      ),
    listMyQuizAttempts: (quizId: string) =>
      latency(
        demoQuizAttempts
          .filter((a) => a.quizId === quizId)
          .map(({ quizId: _quizId, ...attempt }) => attempt)
          .reverse(),
      ),
    listCourseThreads: (courseId: string) =>
      latency(
        demoThreads
          .filter((t) => t.courseId === courseId)
          .map((t) => ({ ...t, replyCount: demoThreadReplies.filter((r) => r.threadId === t.id).length }))
          .reverse(),
      ),
    getCourseThread: (threadId: string) => {
      const thread = demoThreads.find((t) => t.id === threadId);
      if (!thread) return latency(null);
      return latency({
        ...thread,
        replyCount: demoThreadReplies.filter((r) => r.threadId === threadId).length,
      });
    },
    listThreadReplies: (threadId: string) =>
      latency(demoThreadReplies.filter((r) => r.threadId === threadId)),
    createCourseThread: (courseId: string, title: string, body: string) => {
      const thread: CourseThread = {
        id: crypto.randomUUID(),
        courseId,
        authorId: DEMO_STUDENT.id,
        authorName: DEMO_STUDENT.fullName,
        fromStaff: false,
        title,
        body,
        createdAt: new Date().toISOString(),
        replyCount: 0,
      };
      demoThreads.push(thread);
      return latency(thread);
    },
    addThreadReply: (threadId: string, body: string) => {
      const reply: CourseThreadReply = {
        id: crypto.randomUUID(),
        threadId,
        authorId: DEMO_TEACHER.id,
        authorName: DEMO_TEACHER.fullName,
        fromStaff: true,
        body,
        createdAt: new Date().toISOString(),
      };
      demoThreadReplies.push(reply);
      return latency(reply);
    },
    deleteCourseThread: (threadId: string) => {
      const index = demoThreads.findIndex((t) => t.id === threadId);
      if (index !== -1) demoThreads.splice(index, 1);
      return latency(undefined);
    },
    deleteThreadReply: (replyId: string) => {
      const index = demoThreadReplies.findIndex((r) => r.id === replyId);
      if (index !== -1) demoThreadReplies.splice(index, 1);
      return latency(undefined);
    },
    getMyCourseRating: (courseId: string) => latency(demoRatings.get(courseId) ?? null),
    submitCourseRating: (courseId: string, stars: number, review: string) => {
      demoRatings.set(courseId, { stars, review: review || null });
      return latency(undefined);
    },
    listMyAssignments: (courseId: string) =>
      latency(courseId === DEMO_MODULE.courseId ? structuredClone(demoAssignments) : []),
    getMySubmission: (assignmentId: string) =>
      latency(
        demoSubmissions.find((s) => s.assignmentId === assignmentId && s.studentId === DEMO_STUDENT.id) ??
          null,
      ),
    submitAssignment: (assignmentId: string, input) => {
      const assignment = demoAssignments.find((a) => a.id === assignmentId);
      if (!assignment) throw new Error(`Tarea ${assignmentId} no encontrada`);
      const existing = demoSubmissions.find(
        (s) => s.assignmentId === assignmentId && s.studentId === DEMO_STUDENT.id,
      );
      if (existing) throw new Error('Ya existe una entrega — hay que borrarla antes de resubir');
      if (!canStudentSubmit({ dueAt: assignment.dueAt, gradedAt: null }, new Date())) {
        throw new Error('La fecha límite de esta tarea ya venció');
      }
      const submission: AssignmentSubmission = {
        id: crypto.randomUUID(),
        assignmentId,
        studentId: DEMO_STUDENT.id,
        studentName: DEMO_STUDENT.fullName,
        kind: input.kind,
        mediaKey: input.mediaKey,
        fileName: input.fileName,
        submittedAt: new Date().toISOString(),
        grade: null,
        feedback: null,
        gradedAt: null,
      };
      demoSubmissions = [...demoSubmissions, submission];
      return latency(submission);
    },
    deleteMySubmission: (submissionId: string) => {
      const submission = demoSubmissions.find((s) => s.id === submissionId);
      if (!submission) return latency(undefined);
      const assignment = demoAssignments.find((a) => a.id === submission.assignmentId);
      if (
        assignment &&
        !canStudentDelete({ dueAt: assignment.dueAt, gradedAt: submission.gradedAt }, new Date())
      ) {
        throw new Error('Esta entrega ya no se puede borrar (venció o fue calificada)');
      }
      demoSubmissions = demoSubmissions.filter((s) => s.id !== submissionId);
      return latency(undefined);
    },
  },

  practice: {
    getSession: () => latency(structuredClone(store.session)),
    listLevels: () => latency(DEMO_PRACTICE_LEVELS),
    // Se entrega sin `correctOptionId`, igual que haría la API real.
    getQuestion: () => latency({ ...DEMO_QUESTION, correctOptionId: undefined }),

    submitAnswer: (_questionId, optionId) => {
      const correct = optionId === DEMO_QUESTION.correctOptionId;
      if (correct) store.session = { ...store.session, xp: store.session.xp + DEMO_QUESTION.xpReward };
      return latency({
        correct,
        xpGained: correct ? DEMO_QUESTION.xpReward : 0,
        explanation: correct ? DEMO_QUESTION.explanationCorrect : DEMO_QUESTION.explanationWrong,
        correctOptionId: DEMO_QUESTION.correctOptionId!,
      });
    },

    advance: () => {
      store.session = {
        ...store.session,
        step: Math.min(store.session.totalSteps, store.session.step + 1),
      };
      return latency(structuredClone(store.session));
    },
  },

  storage: {
    // Cuota real del plan Free de Supabase (1 GB) — ver `STORAGE_PLAN_LIMIT_BYTES`
    // en `src/lib/storage.ts`, que no se puede importar aquí por ser `server-only`.
    getUsage: () =>
      latency({
        usedBytes: 0.3 * 1024 ** 3,
        limitBytes: 1 * 1024 ** 3,
        usedPercent: 30,
        tier: 'ok',
        byCourse: [],
      }),
  },

  quiz: {
    getQuizDraft: (moduleId: string) =>
      latency(moduleId === DEMO_MODULE.id ? demoQuizDraft : null),
    saveQuizDraft: (moduleId: string, draft: QuizDraft) => {
      if (moduleId === DEMO_MODULE.id) demoQuizDraft = structuredClone(draft);
      return latency(undefined);
    },
    removeQuiz: (moduleId: string) => {
      if (moduleId === DEMO_MODULE.id) demoQuizDraft = null;
      return latency(undefined);
    },
  },

  assignments: {
    listAssignments: (moduleId: string) =>
      latency(demoAssignments.filter((a) => a.moduleId === moduleId)),
    createAssignment: (input: CreateAssignmentInput) => {
      const assignment: Assignment = {
        id: crypto.randomUUID(),
        moduleId: input.moduleId,
        title: input.title,
        instructions: input.instructions,
        mediaKey: input.attachment?.mediaKey ?? null,
        fileName: input.attachment?.fileName ?? null,
        dueAt: input.dueAt,
        createdAt: new Date().toISOString(),
      };
      demoAssignments = [...demoAssignments, assignment];
      return latency(assignment);
    },
    updateAssignment: (id: string, input) => {
      // `attachment === undefined` = no tocar el adjunto existente;
      // `null` = quitarlo explícitamente; objeto = reemplazarlo. Antes
      // `input.attachment?.mediaKey ?? a.mediaKey` no podía distinguir
      // "no tocar" de "quitar" — al hacer clic en "Quitar" el adjunto viejo
      // quedaba intacto.
      demoAssignments = demoAssignments.map((a) =>
        a.id === id
          ? {
              ...a,
              title: input.title,
              instructions: input.instructions,
              dueAt: input.dueAt,
              ...(input.attachment !== undefined
                ? { mediaKey: input.attachment?.mediaKey ?? null, fileName: input.attachment?.fileName ?? null }
                : {}),
            }
          : a,
      );
      const updated = demoAssignments.find((a) => a.id === id);
      if (!updated) throw new Error(`Tarea ${id} no encontrada`);
      return latency(updated);
    },
    removeAssignment: (id: string) => {
      demoAssignments = demoAssignments.filter((a) => a.id !== id);
      demoSubmissions = demoSubmissions.filter((s) => s.assignmentId !== id);
      return latency(undefined);
    },
    listSubmissionsForModule: (moduleId: string) => {
      const assignmentIds = new Set(
        demoAssignments.filter((a) => a.moduleId === moduleId).map((a) => a.id),
      );
      return latency(demoSubmissions.filter((s) => assignmentIds.has(s.assignmentId)));
    },
    gradeSubmission: (submissionId: string, grade: number, feedback: string) => {
      demoSubmissions = demoSubmissions.map((s) =>
        s.id === submissionId
          ? { ...s, grade, feedback, gradedAt: new Date().toISOString() }
          : s,
      );
      const graded = demoSubmissions.find((s) => s.id === submissionId);
      if (!graded) throw new Error(`Entrega ${submissionId} no encontrada`);
      return latency(graded);
    },
    getUngradedCount: () => latency(demoSubmissions.filter((s) => s.grade == null).length),
  },

  account: {
    updateProfile: (fullName: string) => {
      // Best-effort: `demoBackend` corre en el bundle del navegador, un
      // realm de módulos distinto del que usa `getCurrentProfile()` en el
      // servidor (`src/lib/auth/session.ts`) — mutar `DEMO_TEACHER` acá no
      // se refleja en el nombre que renderiza `AdminShell` (server
      // component) tras `router.refresh()`. Sin backend real detrás, el
      // modo demo no tiene dónde persistir esto entre servidor y cliente;
      // el campo sí queda actualizado dentro de esta misma pestaña.
      DEMO_TEACHER.fullName = fullName;
      return latency(undefined);
    },
    // No hay contraseña real en modo demo — se simula el éxito.
    changePassword: () => latency(undefined),
  },

  staff: {
    list: () => latency(structuredClone(demoStaff)),
    invite: (input: { fullName: string; email: string }) => {
      const member: StaffMember = {
        id: newId(),
        fullName: input.fullName,
        email: input.email,
        role: 'admin',
        isActive: true,
        isSuperAdmin: false,
        createdAt: new Date().toISOString(),
      };
      demoStaff = [...demoStaff, member];
      return latency({ email: input.email });
    },
    setActive: (id: string, active: boolean) => {
      demoStaff = demoStaff.map((s) => (s.id === id ? { ...s, isActive: active } : s));
      const updated = demoStaff.find((s) => s.id === id);
      if (!updated) throw new Error(`Miembro del staff ${id} no encontrado`);
      return latency(updated);
    },
    remove: (id: string) => {
      demoStaff = demoStaff.filter((s) => s.id !== id);
      return latency(undefined);
    },
  },

  audit: {
    list: (page: number) => {
      const pageSize = 30;
      const start = (page - 1) * pageSize;
      const items = demoAuditLog.slice(start, start + pageSize);
      return latency({ items, hasMore: start + pageSize < demoAuditLog.length });
    },
  },
};
