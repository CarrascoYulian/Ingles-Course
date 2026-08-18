import { describe, expect, it } from 'vitest';

import { computeAdvance, computeHeartsRemaining, computeStreakDays, findNextBadgeTier } from './logic';

describe('computeHeartsRemaining', () => {
  it('no toca los corazones si la respuesta fue correcta', () => {
    expect(computeHeartsRemaining(true, 2)).toBe(2);
  });

  it('resta uno si fue incorrecta', () => {
    expect(computeHeartsRemaining(false, 2)).toBe(1);
  });

  it('nunca baja de 0', () => {
    expect(computeHeartsRemaining(false, 0)).toBe(0);
  });
});

describe('computeAdvance', () => {
  const base = { currentStep: 3, totalSteps: 10, currentLevel: 1, hasNextLevel: true, currentHearts: 2, heartsTotal: 3 };

  it('avanza un paso dentro del mismo nivel', () => {
    expect(computeAdvance(base)).toEqual({ nextLevel: 1, nextStep: 4, nextHearts: 2 });
  });

  it('sube de nivel y recarga corazones al completar el último paso, si hay nivel siguiente', () => {
    const result = computeAdvance({ ...base, currentStep: 10, totalSteps: 10 });
    expect(result).toEqual({ nextLevel: 2, nextStep: 1, nextHearts: 3 });
  });

  it('se queda repitiendo el último paso si no hay nivel siguiente', () => {
    const result = computeAdvance({ ...base, currentStep: 10, totalSteps: 10, hasNextLevel: false });
    expect(result).toEqual({ nextLevel: 1, nextStep: 1, nextHearts: 2 });
  });
});

describe('computeStreakDays', () => {
  it('no cambia la racha si la meta de hoy no se cumplió', () => {
    expect(
      computeStreakDays({ wasGoalMet: false, isGoalMetNow: false, currentStreak: 5, yesterdayGoalMet: true }),
    ).toBe(5);
  });

  it('no cambia la racha si la meta de hoy ya se había cumplido antes', () => {
    expect(
      computeStreakDays({ wasGoalMet: true, isGoalMetNow: true, currentStreak: 5, yesterdayGoalMet: true }),
    ).toBe(5);
  });

  it('extiende la racha si se cumplió hoy y también ayer', () => {
    expect(
      computeStreakDays({ wasGoalMet: false, isGoalMetNow: true, currentStreak: 5, yesterdayGoalMet: true }),
    ).toBe(6);
  });

  it('reinicia la racha en 1 si se cumplió hoy pero no ayer', () => {
    expect(
      computeStreakDays({ wasGoalMet: false, isGoalMetNow: true, currentStreak: 5, yesterdayGoalMet: false }),
    ).toBe(1);
  });
});

describe('findNextBadgeTier', () => {
  const tiers = [
    { threshold: 100, name: 'Primeros pasos' },
    { threshold: 500, name: 'Medio camino' },
  ];

  it('devuelve la siguiente insignia no alcanzada', () => {
    expect(findNextBadgeTier(150, tiers)).toEqual({ threshold: 500, name: 'Medio camino' });
  });

  it('devuelve la primera insignia si no se ha alcanzado ninguna', () => {
    expect(findNextBadgeTier(0, tiers)).toEqual({ threshold: 100, name: 'Primeros pasos' });
  });

  it('devuelve null si ya se alcanzaron todas', () => {
    expect(findNextBadgeTier(1000, tiers)).toBeNull();
  });
});
