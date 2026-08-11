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
  Badge,
  ContentBlock,
  Course,
  CourseResource,
  DashboardMetrics,
  LeaderboardEntry,
  Lesson,
  Module,
  PracticeLevel,
  PracticeQuestion,
  Profile,
  ReportRange,
  StudentSummary,
} from '@/types';

export const DEMO_TEACHER: Profile = {
  id: 'demo-teacher',
  role: 'admin',
  fullName: 'Daniel Reyes',
  enrollmentCode: null,
  level: null,
  avatarColor: '#0F5257',
};

export const DEMO_STUDENT: Profile = {
  id: 'demo-student',
  role: 'student',
  fullName: 'Juan Carlos Peña',
  enrollmentCode: 'ING-000072',
  level: 'B1',
  avatarColor: '#2F6BFF',
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
    position: 3,
  },
];

export const DEMO_MODULE: Module = {
  id: 'mod-4',
  courseId: '2',
  title: 'Módulo 4 · Tiempos perfectos',
  position: 3,
  requiresModuleId: 'mod-3',
};

const DEMO_UPLOAD_DATE = '2026-07-01T12:00:00.000Z';

export const DEMO_BLOCKS: ContentBlock[] = [
  {
    id: '1',
    moduleId: 'mod-4',
    type: 'Video',
    title: 'Present Perfect vs. Past Simple',
    meta: '14 min · 1080p',
    position: 0,
    mediaKey: 'cursos/2/modulos/mod-4/present-perfect.mp4',
    uploadedBy: DEMO_TEACHER.id,
    createdAt: DEMO_UPLOAD_DATE,
  },
  {
    id: '2',
    moduleId: 'mod-4',
    type: 'PDF',
    title: 'Guía de tiempos perfectos',
    meta: '820 KB',
    position: 1,
    mediaKey: 'cursos/2/modulos/mod-4/guia-tiempos-perfectos.pdf',
    uploadedBy: DEMO_TEACHER.id,
    createdAt: DEMO_UPLOAD_DATE,
  },
  {
    id: '3',
    moduleId: 'mod-4',
    type: 'Ejercicio',
    title: 'Completar 12 oraciones',
    meta: '10 preguntas',
    position: 2,
    mediaKey: null,
    uploadedBy: null,
    createdAt: DEMO_UPLOAD_DATE,
  },
  {
    id: '4',
    moduleId: 'mod-4',
    type: 'Audio',
    title: 'Listening · At the market',
    meta: '4,2 MB',
    position: 3,
    mediaKey: 'cursos/2/modulos/mod-4/listening-at-the-market.mp3',
    uploadedBy: DEMO_TEACHER.id,
    createdAt: DEMO_UPLOAD_DATE,
  },
  {
    id: '5',
    moduleId: 'mod-4',
    type: 'Evaluación',
    title: 'Examen del módulo 4',
    meta: '20 preguntas · 70 % para aprobar',
    position: 4,
    mediaKey: null,
    uploadedBy: null,
    createdAt: DEMO_UPLOAD_DATE,
  },
];

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

export const DEMO_LESSONS: Lesson[] = [
  { id: 'l1', moduleId: 'mod-4', order: 1, title: 'Repaso: Past Simple', duration: '9 min', durationSeconds: 540, state: 'done', watchedPercent: 100, mediaKey: null, description: null },
  { id: 'l2', moduleId: 'mod-4', order: 2, title: 'Present Perfect: forma', duration: '12 min', durationSeconds: 720, state: 'done', watchedPercent: 100, mediaKey: null, description: null },
  { id: 'l3', moduleId: 'mod-4', order: 3, title: 'Participios irregulares', duration: '11 min', durationSeconds: 660, state: 'done', watchedPercent: 100, mediaKey: null, description: null },
  { id: 'l4', moduleId: 'mod-4', order: 4, title: 'Ever, never, just, yet', duration: '10 min', durationSeconds: 600, state: 'done', watchedPercent: 100, mediaKey: null, description: null },
  { id: 'l5', moduleId: 'mod-4', order: 5, title: 'Present Perfect vs. Past Simple', duration: '14 min', durationSeconds: 840, state: 'current', watchedPercent: 38, mediaKey: null, description: null },
  { id: 'l6', moduleId: 'mod-4', order: 6, title: 'Práctica guiada de diálogo', duration: '13 min', durationSeconds: 780, state: 'locked', watchedPercent: 0, mediaKey: null, description: null },
  { id: 'l7', moduleId: 'mod-4', order: 7, title: 'Listening: at the market', duration: '8 min', durationSeconds: 480, state: 'locked', watchedPercent: 0, mediaKey: null, description: null },
  { id: 'l8', moduleId: 'mod-4', order: 8, title: 'Evaluación del módulo', duration: '20 min', durationSeconds: 1200, state: 'locked', watchedPercent: 0, mediaKey: null, description: null },
  { id: 'l9', moduleId: 'mod-4', order: 9, title: 'Cierre y recursos extra', duration: '6 min', durationSeconds: 360, state: 'locked', watchedPercent: 0, mediaKey: null, description: null },
];

export const DEMO_RESOURCES: CourseResource[] = [
  { id: 'r1', type: 'PDF', title: 'Lista de verbos irregulares', meta: 'Módulos 1-4 · 1,2 MB', mediaKey: 'recursos/verbos-irregulares.pdf' },
  { id: 'r2', type: 'MP3', title: 'Pack de listening B1', meta: '12 audios · 38 MB', mediaKey: 'recursos/listening-b1.zip' },
  { id: 'r3', type: 'DOC', title: 'Plantilla de diario en inglés', meta: 'Uso diario · 90 KB', mediaKey: 'recursos/diario.docx' },
  { id: 'r4', type: 'PDF', title: 'Guía de pronunciación', meta: 'Transcripción fonética · 640 KB', mediaKey: 'recursos/pronunciacion.pdf' },
];

export const DEMO_BADGES: Badge[] = [
  { id: 'b1', name: 'Racha de 7 días', state: 'Obtenida', earned: true },
  { id: 'b2', name: 'Primer módulo', state: 'Obtenida', earned: true },
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
      { text: 'Módulo 4 · Past Perfect', strong: true },
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

export const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  { id: '1', rank: 1, name: 'María Altagracia', enrollmentCode: 'ING-000014', level: 'B2', score: 96, avatarColor: '#0F5257', initials: 'MA' },
  { id: '2', rank: 2, name: 'Juan Carlos Peña', enrollmentCode: 'ING-000072', level: 'B1', score: 91, avatarColor: '#2F6BFF', initials: 'JC' },
  { id: '3', rank: 3, name: 'Laura Rivas', enrollmentCode: 'ING-000009', level: 'B2', score: 88, avatarColor: '#7A5AF8', initials: 'LR' },
  { id: '4', rank: 4, name: 'Sofía Domínguez', enrollmentCode: 'ING-000131', level: 'A2', score: 80, avatarColor: '#0EA5A8', initials: 'SD' },
  { id: '5', rank: 5, name: 'Ramón Bautista', enrollmentCode: 'ING-000045', level: 'A2', score: 74, avatarColor: '#475569', initials: 'RB' },
];

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
