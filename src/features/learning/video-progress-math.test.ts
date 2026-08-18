import { describe, expect, it } from 'vitest';

import { canAdvanceLesson, computeElapsedSeconds, formatTimeLabel } from './video-progress-math';

describe('computeElapsedSeconds', () => {
  it('calcula el segundo actual a partir del porcentaje visto', () => {
    expect(computeElapsedSeconds(50, 600)).toBe(300);
  });

  it('redondea en vez de truncar', () => {
    expect(computeElapsedSeconds(33, 100)).toBe(33);
    expect(computeElapsedSeconds(1, 3)).toBe(0);
  });

  it('devuelve 0 en 0 % y la duración completa en 100 %', () => {
    expect(computeElapsedSeconds(0, 504)).toBe(0);
    expect(computeElapsedSeconds(100, 504)).toBe(504);
  });
});

describe('formatTimeLabel', () => {
  it('formatea minutos y segundos con ceros a la izquierda', () => {
    expect(formatTimeLabel(192, 504)).toBe('03:12 / 08:24');
  });

  it('formatea 0:00 correctamente', () => {
    expect(formatTimeLabel(0, 65)).toBe('00:00 / 01:05');
  });

  it('formatea duraciones de más de una hora sin desbordar', () => {
    expect(formatTimeLabel(3661, 7200)).toBe('61:01 / 120:00');
  });
});

describe('canAdvanceLesson', () => {
  it('nunca bloquea una lección sin video adjunto', () => {
    expect(canAdvanceLesson(false, 0)).toBe(true);
    expect(canAdvanceLesson(false, 40)).toBe(true);
  });

  it('exige el 100% cuando sí hay video', () => {
    expect(canAdvanceLesson(true, 99)).toBe(false);
    expect(canAdvanceLesson(true, 100)).toBe(true);
  });
});
