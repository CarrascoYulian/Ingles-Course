import { describe, expect, it } from 'vitest';

import { toLesson } from './mappers';
import type { Database } from '@/types';

type LessonRow = Database['public']['Tables']['lessons']['Row'];

function makeRow(overrides: Partial<LessonRow> = {}): LessonRow {
  return {
    id: 'lesson-1',
    module_id: 'module-1',
    position: 1,
    title: 'Lección de prueba',
    duration_minutes: 10,
    duration_seconds: 600,
    media_key: null,
    description: null,
    type: 'Video',
    meta: '',
    uploaded_by: null,
    ...overrides,
  };
}

describe('toLesson', () => {
  it('marca "done" cuando hay progreso completado, sin importar previousCompleted', () => {
    const lesson = toLesson(makeRow(), { watchedPercent: 100, completed: true }, false);
    expect(lesson.state).toBe('done');
  });

  it('marca "current" la primera lección de la lista (previousCompleted arranca en true)', () => {
    const lesson = toLesson(makeRow(), undefined, true);
    expect(lesson.state).toBe('current');
  });

  it('marca "locked" una lección posterior a una que aún no se completó', () => {
    const lesson = toLesson(makeRow({ position: 3 }), undefined, false);
    expect(lesson.state).toBe('locked');
  });

  it('no depende de `position === 1`: una lección sin completar en cualquier posición queda "current" si la anterior ya se completó', () => {
    const lesson = toLesson(makeRow({ position: 7 }), undefined, true);
    expect(lesson.state).toBe('current');
  });

  it('expone mediaKey y duración legible desde la fila real', () => {
    const lesson = toLesson(
      makeRow({ media_key: 'cursos/x/video.mp4', duration_seconds: 840 }),
      undefined,
      true,
    );
    expect(lesson.mediaKey).toBe('cursos/x/video.mp4');
    expect(lesson.duration).toBe('14 min');
  });

  it('muestra segundos, no un minuto inventado, para clips de menos de un minuto', () => {
    const lesson = toLesson(makeRow({ duration_seconds: 6 }), undefined, true);
    expect(lesson.duration).toBe('0:06');
    expect(lesson.durationSeconds).toBe(6);
  });

  it('redondea watchedPercent', () => {
    const lesson = toLesson(makeRow(), { watchedPercent: 37.6, completed: false }, true);
    expect(lesson.watchedPercent).toBe(38);
  });
});
