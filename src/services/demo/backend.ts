import { inferBlockType } from '@/features/content/infer-block-type';
import type { AttachUploadInput, Backend } from '../ports';
import {
  DEMO_ACTIVITY,
  DEMO_BADGES,
  DEMO_BLOCKS,
  DEMO_COURSES,
  DEMO_LEADERBOARD,
  DEMO_LESSONS,
  DEMO_METRICS,
  DEMO_MODULE,
  DEMO_PRACTICE_LEVELS,
  DEMO_QUESTION,
  DEMO_REPORT_BARS,
  DEMO_RESOURCES,
  DEMO_STUDENTS,
  DEMO_TEACHER,
} from './data';
import type {
  Badge,
  BlockType,
  ContentBlock,
  Course,
  CourseResource,
  Lesson,
  LessonNote,
  PracticeSession,
  ReportRange,
  StudentSummary,
} from '@/types';

const demoNotes: LessonNote[] = [];

/**
 * Adaptador en memoria. Reproduce toda la lógica del prototipo (crear curso,
 * publicar, reordenar bloques, reiniciar progreso, corregir ejercicio) para
 * que la interfaz sea plenamente navegable sin infraestructura.
 */

interface DemoStore {
  courses: Course[];
  blocks: ContentBlock[];
  students: StudentSummary[];
  session: PracticeSession;
}

const store: DemoStore = {
  courses: structuredClone(DEMO_COURSES),
  blocks: structuredClone(DEMO_BLOCKS),
  students: structuredClone(DEMO_STUDENTS),
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
  },

  content: {
    getModule: () => latency(DEMO_MODULE),

    // El fixture en memoria sólo modela un módulo de referencia por curso.
    listModules: (courseId) =>
      latency(DEMO_MODULE.courseId === courseId ? [DEMO_MODULE] : []),

    listBlocks: (moduleId) =>
      latency(
        store.blocks
          .filter((b) => b.moduleId === moduleId)
          .map((b, index) => ({ ...b, position: index })),
      ),

    addBlock: (moduleId, type) => {
      const defaults = NEW_BLOCK_DEFAULTS[type];
      const block: ContentBlock = {
        id: newId(),
        moduleId,
        type,
        title: defaults.title,
        meta: defaults.meta,
        position: store.blocks.length,
        mediaKey: null,
        uploadedBy: null,
        createdAt: new Date().toISOString(),
      };
      store.blocks = [...store.blocks, block];
      return latency(block);
    },

    moveBlock: (moduleId, blockId, direction) => {
      const list = [...store.blocks];
      const from = list.findIndex((b) => b.id === blockId);
      const to = from + direction;
      if (from >= 0 && to >= 0 && to < list.length) {
        [list[from], list[to]] = [list[to]!, list[from]!];
        store.blocks = list;
      }
      return latency(
        store.blocks
          .filter((b) => b.moduleId === moduleId)
          .map((b, index) => ({ ...b, position: index })),
      );
    },

    removeBlock: (blockId) => {
      store.blocks = store.blocks.filter((b) => b.id !== blockId);
      return latency(undefined);
    },

    attachUpload: (input: AttachUploadInput) => {
      const block: ContentBlock = {
        id: newId(),
        moduleId: input.moduleId,
        type: inferBlockType(input.contentType),
        title: input.fileName,
        meta: input.sizeLabel,
        position: store.blocks.length,
        mediaKey: input.mediaKey,
        uploadedBy: DEMO_TEACHER.id,
        createdAt: new Date().toISOString(),
      };
      store.blocks = [...store.blocks, block];
      return latency(block);
    },

    // En modo demo el archivo vive de verdad en /public/demo-uploads (ver
    // upload.ts): no hay Storage real que firmar, así que se devuelve la
    // ruta servida por Next tal cual.
    getFileUrl: (mediaKey: string) => latency(`/demo-uploads/${mediaKey}`),
    updateLesson: () => latency(undefined),
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

    enroll: () => latency(undefined),

    sendMessage: () => latency(undefined),
  },

  analytics: {
    getMetrics: () => latency(DEMO_METRICS),
    getActivity: () => latency(DEMO_ACTIVITY),
    getLeaderboard: () => latency(DEMO_LEADERBOARD),
    getReport: (range: ReportRange) =>
      latency({
        range,
        bars: DEMO_REPORT_BARS[range],
        retention: { value: '91 %', delta: '+2,4 pts vs. periodo anterior' },
        dropOff: { lesson: '4.8 Evaluación del módulo', rate: '32 % la deja sin terminar' },
        recommendation:
          'Divide la evaluación 4.8 en dos partes: el abandono se concentra después del minuto 12.',
      }),
  },

  learning: {
    getMyCourses: () => latency(store.courses.filter((c) => c.id === DEMO_MODULE.courseId)),
    getCurrentModule: (courseId) =>
      latency(courseId === DEMO_MODULE.courseId ? DEMO_MODULE : null),
    listLessons: (): Promise<Lesson[]> => latency(DEMO_LESSONS),
    // El modo demo no tiene Storage real: ninguna lección de referencia
    // tiene `mediaKey`, así que esta ruta nunca llega a llamarse en la
    // práctica — se deja implementada por completar el contrato.
    getLessonVideoUrl: () => latency(null),
    listResources: (): Promise<CourseResource[]> => latency(DEMO_RESOURCES),
    listBadges: (): Promise<Badge[]> => latency(DEMO_BADGES),
    saveWatchedPercent: () => latency(undefined, 0),
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
};
