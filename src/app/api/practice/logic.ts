/**
 * Cálculos puros de la sesión de práctica (XP, corazones, avance de nivel,
 * racha). Separados de `_missions.ts`/`answer/route.ts`/`advance/route.ts`
 * (que sí tocan Supabase) para poder probarlos sin red ni `server-only` —
 * ver `logic.test.ts`.
 */

export interface AdvanceInput {
  currentStep: number;
  totalSteps: number;
  currentLevel: number;
  hasNextLevel: boolean;
  currentHearts: number;
  heartsTotal: number;
}

export interface AdvanceResult {
  nextLevel: number;
  nextStep: number;
  nextHearts: number;
}

/**
 * Decide el próximo nivel/paso/corazones al avanzar. Completar el último
 * paso del nivel sube de nivel sólo si existe un nivel siguiente (si no,
 * se queda repitiendo el último paso); subir de nivel recarga los
 * corazones, igual que un punto de control.
 */
export function computeAdvance(input: AdvanceInput): AdvanceResult {
  const completingLevel = input.currentStep >= input.totalSteps;
  const nextLevel = completingLevel && input.hasNextLevel ? input.currentLevel + 1 : input.currentLevel;
  const nextStep = completingLevel ? 1 : input.currentStep + 1;
  const nextHearts = nextLevel !== input.currentLevel ? input.heartsTotal : input.currentHearts;
  return { nextLevel, nextStep, nextHearts };
}

/** Una respuesta correcta no toca los corazones; una incorrecta resta uno, nunca por debajo de 0. */
export function computeHeartsRemaining(correct: boolean, current: number): number {
  return correct ? current : Math.max(0, current - 1);
}

export interface StreakInput {
  wasGoalMet: boolean;
  isGoalMetNow: boolean;
  currentStreak: number;
  yesterdayGoalMet: boolean;
}

/**
 * Cumplir la meta diaria hoy Y haberla cumplido ayer extiende la racha en
 * uno; cumplirla hoy sin haberla cumplido ayer la reinicia en 1. No
 * cumplirla hoy, o haberla cumplido ya antes hoy, no cambia nada.
 */
export function computeStreakDays(input: StreakInput): number {
  if (!input.isGoalMetNow || input.wasGoalMet) return input.currentStreak;
  return input.yesterdayGoalMet ? input.currentStreak + 1 : 1;
}

export interface XpBadgeTier {
  threshold: number;
  name: string;
}

/** Primera insignia todavía no alcanzada, o `null` si ya se alcanzaron todas. */
export function findNextBadgeTier(totalXp: number, tiers: readonly XpBadgeTier[]): XpBadgeTier | null {
  return tiers.find((tier) => tier.threshold > totalXp) ?? null;
}
