import { describe, expect, it } from 'vitest';

import { canStudentDelete, canStudentSubmit, computeAssignmentStatus } from './submission-rules';

const NOW = new Date('2026-08-20T12:00:00Z');
const FUTURE = '2026-08-21T12:00:00Z';
const PAST = '2026-08-19T12:00:00Z';

describe('canStudentSubmit', () => {
  it('permite subir antes de vencer y sin calificar', () => {
    expect(canStudentSubmit({ dueAt: FUTURE, gradedAt: null }, NOW)).toBe(true);
  });

  it('bloquea una vez vencida la fecha, aunque no esté calificada', () => {
    expect(canStudentSubmit({ dueAt: PAST, gradedAt: null }, NOW)).toBe(false);
  });

  it('bloquea si ya fue calificada, aunque no haya vencido', () => {
    expect(canStudentSubmit({ dueAt: FUTURE, gradedAt: '2026-08-20T10:00:00Z' }, NOW)).toBe(false);
  });

  it('el límite exacto (due_at === now) ya no permite subir', () => {
    const dueAt = NOW.toISOString();
    expect(canStudentSubmit({ dueAt, gradedAt: null }, NOW)).toBe(false);
  });
});

describe('canStudentDelete', () => {
  it('es simétrico a canStudentSubmit', () => {
    expect(canStudentDelete({ dueAt: FUTURE, gradedAt: null }, NOW)).toBe(true);
    expect(canStudentDelete({ dueAt: PAST, gradedAt: null }, NOW)).toBe(false);
    expect(canStudentDelete({ dueAt: FUTURE, gradedAt: '2026-08-20T10:00:00Z' }, NOW)).toBe(false);
  });
});

describe('computeAssignmentStatus', () => {
  it('pendiente: sin entrega, sin vencer, sin calificar', () => {
    expect(computeAssignmentStatus({ dueAt: FUTURE, gradedAt: null }, false, NOW)).toBe('pending');
  });

  it('vencida: sin entrega y ya pasó la fecha', () => {
    expect(computeAssignmentStatus({ dueAt: PAST, gradedAt: null }, false, NOW)).toBe('overdue');
  });

  it('entregada: hay entrega, sin calificar', () => {
    expect(computeAssignmentStatus({ dueAt: FUTURE, gradedAt: null }, true, NOW)).toBe('submitted');
    expect(computeAssignmentStatus({ dueAt: PAST, gradedAt: null }, true, NOW)).toBe('submitted');
  });

  it('calificada: gradedAt manda sobre cualquier otro estado', () => {
    expect(computeAssignmentStatus({ dueAt: PAST, gradedAt: '2026-08-19T13:00:00Z' }, true, NOW)).toBe(
      'graded',
    );
  });
});
