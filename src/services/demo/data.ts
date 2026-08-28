/**
 * Datos de demostración. Contenido idéntico al mockup original: mismos
 * nombres, matrículas, porcentajes y textos. Permite ejecutar el proyecto
 * completo sin Supabase (`npm run dev` y listo).
 *
 * Este módulo es el ÚNICO lugar con datos ficticios. Ningún componente los
 * importa directamente: siempre pasan por `services/`.
 */

import type {
  ActivityEvent,
  Assignment,
  Badge,
  Course,
  DashboardMetrics,
  Lesson,
  Module,
  PracticeLevel,
  PracticeQuestion,
  Profile,
  QuizDraft,
  ReportRange,
  StudentPerformanceSummary,
  StudentSummary,
} from '@/types';

export const DEMO_TEACHER: Profile = {
  id: 'demo-teacher',
  role: 'admin',
  fullName: 'Robertho',
  enrollmentCode: null,
  level: null,
  avatarColor: '#0F5257',
  isSuperAdmin: true,
};

export const DEMO_STUDENT: Profile = {
  id: 'demo-student',
  role: 'student',
  fullName: 'Juan Carlos Peña',
  enrollmentCode: 'ING-000072',
  level: 'B1',
  avatarColor: '#2F6BFF',
  isSuperAdmin: false,
};

export const DEMO_COURSES: Course[] = [
  {
    id: '1',
    name: 'Inglés desde cero',
    level: 'A1',
    students: 124,
    progress: 78,
    modules: 8,
    published: true,
    archived: false,
    position: 0,
  },
  {
    id: '2',
    name: 'Inglés conversacional',
    level: 'B1',
    students: 148,
    progress: 54,
    modules: 12,
    published: true,
    archived: false,
    position: 1,
  },
  {
    id: '3',
    name: 'Inglés para negocios',
    level: 'B2',
    students: 0,
    progress: 0,
    modules: 8,
    published: false,
    archived: false,
    position: 2,
  },
  {
    id: '4',
    name: 'Pronunciación intensiva',
    level: 'A2',
    students: 70,
    progress: 41,
    modules: 6,
    published: true,
    archived: false,
    position: 3,
  },
];

export const DEMO_MODULE: Module = {
  id: 'mod-4',
  courseId: '2',
  title: 'Unidad 4 · Tiempos perfectos',
  position: 3,
  requiresModuleId: 'mod-3',
};

/** Único quiz de referencia en modo demo — ligado a `DEMO_MODULE`. */
export const DEMO_QUIZ_ID = 'quiz-mod-4';

export const DEMO_QUIZ_DRAFT: QuizDraft = {
  passingScore: 70,
  questions: [
    {
      prompt: '¿Cuál es la forma correcta del Present Perfect para "she / finish / her homework"?',
      options: [
        { label: 'She has finished her homework.', isCorrect: true },
        { label: 'She have finished her homework.', isCorrect: false },
        { label: 'She finished has her homework.', isCorrect: false },
      ],
    },
    {
      prompt: '¿Qué palabra NO se usa típicamente con Present Perfect?',
      options: [
        { label: 'yesterday', isCorrect: true },
        { label: 'already', isCorrect: false },
        { label: 'just', isCorrect: false },
      ],
    },
  ],
};

/** Única tarea de referencia en modo demo — ligada a `DEMO_MODULE`. */
export const DEMO_ASSIGNMENT: Assignment = {
  id: 'assignment-mod-4',
  moduleId: DEMO_MODULE.id,
  title: 'Redacción: un día en Present Perfect',
  instructions:
    'Escribe un párrafo de al menos 8 oraciones contando qué has hecho esta semana, usando Present Perfect. Sube el archivo o graba un audio leyéndolo en voz alta.',
  mediaKey: null,
  fileName: null,
  dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
};

export const DEMO_STUDENTS: StudentSummary[] = [
  {
    id: '1',
    enrollmentCode: 'ING-000014',
    name: 'María Altagracia',
    level: 'B2',
    progress: 92,
    hours: 41,
    lessons: 96,
    active: true,
    avatarColor: '#2F6BFF',
  },
  {
    id: '2',
    enrollmentCode: 'ING-000072',
    name: 'Juan Carlos Peña',
    level: 'B1',
    progress: 54,
    hours: 18,
    lessons: 41,
    active: true,
    avatarColor: '#7A5AF8',
  },
  {
    id: '3',
    enrollmentCode: 'ING-000009',
    name: 'Laura Rivas',
    level: 'B2',
    progress: 88,
    hours: 36,
    lessons: 88,
    active: true,
    avatarColor: '#0EA5A8',
  },
  {
    id: '4',
    enrollmentCode: 'ING-000131',
    name: 'Sofía Domínguez',
    level: 'A2',
    progress: 63,
    hours: 22,
    lessons: 80,
    active: true,
    avatarColor: '#475569',
  },
  {
    id: '5',
    enrollmentCode: 'ING-000045',
    name: 'Ramón Bautista',
    level: 'A2',
    progress: 47,
    hours: 15,
    lessons: 74,
    active: false,
    avatarColor: '#B4790C',
  },
  {
    id: '6',
    enrollmentCode: 'ING-000201',
    name: 'Yeimy Núñez',
    level: 'A1',
    progress: 9,
    hours: 2,
    lessons: 6,
    active: true,
    avatarColor: '#0F5257',
  },
];

// Ítems mezclados a propósito (video + PDF + audio + evaluación) en la misma
// secuencia — es justo lo que el editor real produce ahora que `lessons` es
// la única tabla: el orden del docente es el orden que recorre el alumno,
// sin una lista de "Recursos" aparte.
export const DEMO_LESSONS: Lesson[] = (
  [
    { id: 'l1', moduleId: 'mod-4', order: 1, type: 'Video', title: 'Repaso: Past Simple', meta: '9 min · 1080p', duration: '9 min', durationSeconds: 540, state: 'done', watchedPercent: 100, mediaKey: null, description: null, uploadedBy: DEMO_TEACHER.id },
    { id: 'l2', moduleId: 'mod-4', order: 2, type: 'Video', title: 'Present Perfect: forma', meta: '12 min · 1080p', duration: '12 min', durationSeconds: 720, state: 'done', watchedPercent: 100, mediaKey: null, description: null, uploadedBy: DEMO_TEACHER.id },
    { id: 'l3', moduleId: 'mod-4', order: 3, type: 'PDF', title: 'Guía de tiempos perfectos', meta: '820 KB', duration: '820 KB', durationSeconds: 0, state: 'done', watchedPercent: 100, mediaKey: null, description: null, uploadedBy: DEMO_TEACHER.id },
    { id: 'l4', moduleId: 'mod-4', order: 4, type: 'Video', title: 'Ever, never, just, yet', meta: '10 min · 1080p', duration: '10 min', durationSeconds: 600, state: 'done', watchedPercent: 100, mediaKey: null, description: null, uploadedBy: DEMO_TEACHER.id },
    { id: 'l5', moduleId: 'mod-4', order: 5, type: 'Video', title: 'Present Perfect vs. Past Simple', meta: '14 min · 1080p', duration: '14 min', durationSeconds: 840, state: 'current', watchedPercent: 38, mediaKey: null, description: null, uploadedBy: DEMO_TEACHER.id },
    { id: 'l6', moduleId: 'mod-4', order: 6, type: 'Video', title: 'Práctica guiada de diálogo', meta: '13 min · 1080p', duration: '13 min', durationSeconds: 780, state: 'locked', watchedPercent: 0, mediaKey: null, description: null, uploadedBy: DEMO_TEACHER.id },
    { id: 'l7', moduleId: 'mod-4', order: 7, type: 'Audio', title: 'Listening: at the market', meta: '4,2 MB', duration: '4,2 MB', durationSeconds: 0, state: 'locked', watchedPercent: 0, mediaKey: null, description: null, uploadedBy: DEMO_TEACHER.id },
    { id: 'l8', moduleId: 'mod-4', order: 8, type: 'Evaluación', title: 'Evaluación de la unidad', meta: '20 preguntas · 70 % para aprobar', duration: '20 preguntas', durationSeconds: 0, state: 'locked', watchedPercent: 0, mediaKey: null, description: null, uploadedBy: null },
    { id: 'l9', moduleId: 'mod-4', order: 9, type: 'Video', title: 'Cierre y recursos extra', meta: '6 min · 1080p', duration: '6 min', durationSeconds: 360, state: 'locked', watchedPercent: 0, mediaKey: null, description: null, uploadedBy: DEMO_TEACHER.id },
  ] as Array<Omit<Lesson, 'transcript'>>
).map((l) => ({ ...l, transcript: null }));

export const DEMO_BADGES: Badge[] = [
  { id: 'b1', name: 'Racha de 7 días', state: 'Obtenida', earned: true },
  { id: 'b2', name: 'Primera unidad', state: 'Obtenida', earned: true },
  { id: 'b3', name: '10 h de estudio', state: 'Obtenida', earned: true },
  { id: 'b4', name: 'Sin errores ×20', state: 'Obtenida', earned: true },
  { id: 'b5', name: 'Maestro del pasado', state: '4 ejercicios más', earned: false },
  { id: 'b6', name: 'Racha de 30 días', state: 'Faltan 18 días', earned: false },
];

export const DEMO_ACTIVITY: ActivityEvent[] = [
  {
    id: 'a1',
    tone: 'success',
    segments: [
      { text: 'María Altagracia completó ' },
      { text: 'Unidad 4 · Past Perfect', strong: true },
    ],
    timeAgo: 'hace 6 min',
  },
  {
    id: 'a2',
    tone: 'info',
    segments: [
      { text: 'Nuevo registro · ' },
      { text: 'ING-000343', strong: true },
      { text: ' Yeimy Núñez' },
    ],
    timeAgo: 'hace 21 min',
  },
  {
    id: 'a3',
    tone: 'warning',
    segments: [
      { text: 'Juan Carlos Peña obtuvo la insignia ' },
      { text: 'Racha de 30 días', strong: true },
    ],
    timeAgo: 'hace 48 min',
  },
  {
    id: 'a4',
    tone: 'danger',
    segments: [
      { text: 'Falló la subida de ' },
      { text: 'listening-b1-07.mp4', strong: true },
      { text: ' · reintentar' },
    ],
    timeAgo: 'hace 2 h',
  },
];

/**
 * Rendimiento en evaluaciones (quiz_attempts) por alumno demo, keyed por
 * `DEMO_STUDENTS[i].id`. El id '5' (Ramón Bautista) queda sin entrada a
 * propósito, para ejercitar el estado "sin intentos todavía" en la tabla.
 */
export const DEMO_STUDENT_PERFORMANCE: Record<
  string,
  Pick<StudentPerformanceSummary, 'avgScore' | 'passRate' | 'attempts' | 'lastAttemptAt'>
> = {
  '1': { avgScore: 94, passRate: 100, attempts: 6, lastAttemptAt: '2026-08-18T14:20:00.000Z' },
  '2': { avgScore: 71, passRate: 67, attempts: 9, lastAttemptAt: '2026-08-17T09:05:00.000Z' },
  '3': { avgScore: 88, passRate: 90, attempts: 5, lastAttemptAt: '2026-08-19T11:40:00.000Z' },
  '4': { avgScore: 62, passRate: 40, attempts: 4, lastAttemptAt: '2026-08-14T16:10:00.000Z' },
};

export const DEMO_METRICS: DashboardMetrics = {
  activeStudents: {
    value: 287,
    deltaLabel: '+12,4 %',
    ratio: 84,
    caption: '84 % del total · 55 inactivos',
  },
  averageProgress: { value: 62, deltaLabel: '+3,1 pts', caption: 'Meta trimestral: 70 %' },
  watchedHours: {
    value: '4.128',
    deltaLabel: '+318',
    sparkline: [38, 52, 44, 68, 60, 82, 96],
  },
  library: { courses: 6, modules: 34, videos: 218, drafts: 3 },
  weeklyLessons: [
    { label: 'Sem 1', previous: 34, current: 46 },
    { label: 'Sem 2', previous: 42, current: 58 },
    { label: 'Sem 3', previous: 38, current: 51 },
    { label: 'Sem 4', previous: 55, current: 72 },
    { label: 'Sem 5', previous: 49, current: 66 },
    { label: 'Sem 6', previous: 61, current: 88 },
    { label: 'Sem 7', previous: 57, current: 79 },
    { label: 'Sem 8', previous: 66, current: 100 },
  ],
  totalStudents: 342,
};

export const DEMO_REPORT_BARS: Record<ReportRange, number[]> = {
  '7 días': [42, 55, 48, 70, 62, 84, 76],
  '30 días': [46, 58, 51, 72, 66, 88, 100],
  Trimestre: [30, 44, 52, 61, 70, 78, 92],
  Año: [22, 35, 40, 48, 58, 66, 80],
};

export const DEMO_PRACTICE_LEVELS: PracticeLevel[] = [
  { id: 'n1', order: 1, title: 'Nivel 1 · Saludos', state: 'done', xp: 240, totalSteps: 10, completedSteps: 10 },
  { id: 'n2', order: 2, title: 'Nivel 2 · Rutinas', state: 'done', xp: 310, totalSteps: 10, completedSteps: 10 },
  { id: 'n3', order: 3, title: 'Nivel 3 · Pasado simple', state: 'current', xp: null, totalSteps: 10, completedSteps: 6 },
  { id: 'n4', order: 4, title: 'Nivel 4 · Futuro', state: 'locked', xp: null, totalSteps: 10, completedSteps: 0 },
  { id: 'n5', order: 5, title: 'Nivel 5 · Condicionales', state: 'locked', xp: null, totalSteps: 10, completedSteps: 0 },
];

export const DEMO_QUESTION: PracticeQuestion = {
  id: 'q1',
  category: 'GRAMÁTICA',
  xpReward: 15,
  prompt: 'Elige la traducción correcta',
  sourceText: '“Ayer fui al mercado con mi hermana.”',
  audioKey: 'practica/nivel-3/ayer-fui-al-mercado.mp3',
  options: [
    { id: 'o0', key: 'A', text: 'Yesterday I went to the market with my sister.' },
    { id: 'o1', key: 'B', text: 'Yesterday I go to the market with my sister.' },
    {
      id: 'o2',
      key: 'C',
      text: 'Yesterday I have gone to the market with my sister.',
      shortText: 'Yesterday I have gone to the market…',
    },
    {
      id: 'o3',
      key: 'D',
      text: 'Yesterday I was going to the market with my sister.',
      shortText: 'Yesterday I was going to the market…',
    },
  ],
  correctOptionId: 'o0',
  explanationCorrect: '“Yesterday” marca un momento cerrado, por eso va en Past Simple.',
  explanationWrong:
    'Con un tiempo cerrado como “yesterday” se usa Past Simple, no Present Perfect.',
};
