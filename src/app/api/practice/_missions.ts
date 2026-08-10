import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { DAILY_XP_GOAL, XP_BADGE_TIERS } from './_constants';
import type { Database, PracticeMissions } from '@/types';

/** Fixture del modo demo — nunca se sirve fuera de él. */
export const DEMO_MISSIONS: PracticeMissions = {
  dailyXp: { earned: 45, goal: 60 },
  weeklyStreak: { done: 3, total: 5 },
  nextBadge: { name: 'Maestro del pasado', requirement: '4 ejercicios más sin errores' },
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Calcula la meta diaria de XP, la racha de los últimos 7 días y la
 * próxima insignia por hitos de XP acumulado — antes las tres eran
 * literales fijos («45/60 XP», «3 de 5 días», «Maestro del pasado») sin
 * ningún dato real detrás, iguales para cualquier alumno.
 */
export async function getMissions(
  supabase: SupabaseClient<Database>,
  studentId: string,
  totalXp: number,
): Promise<PracticeMissions> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 6); // últimos 7 días, hoy incluido
  const sinceISO = since.toISOString().slice(0, 10);

  const { data: days } = await supabase
    .from('practice_daily_progress')
    .select('date, xp_earned, goal_met')
    .eq('student_id', studentId)
    .gte('date', sinceISO);

  const today = todayISO();
  const todayRow = days?.find((d) => d.date === today);
  const doneCount = days?.filter((d) => d.goal_met).length ?? 0;

  const nextTier = XP_BADGE_TIERS.find((t) => t.threshold > totalXp) ?? null;

  return {
    dailyXp: { earned: todayRow?.xp_earned ?? 0, goal: DAILY_XP_GOAL },
    weeklyStreak: { done: Math.min(7, doneCount), total: 7 },
    nextBadge: nextTier
      ? { name: nextTier.name, requirement: `${nextTier.threshold - totalXp} XP más` }
      : null,
  };
}

/**
 * Registra el XP ganado hoy y devuelve la racha actualizada — antes
 * `streak_days` nunca se recalculaba en ningún endpoint, sólo se leía.
 * Cumplir la meta diaria hoy Y haberla cumplido ayer extiende la racha;
 * cumplirla hoy sin haberla cumplido ayer la reinicia en 1.
 */
export async function recordDailyXpAndStreak(
  supabase: SupabaseClient<Database>,
  studentId: string,
  xpGainedNow: number,
  currentStreak: number,
): Promise<number> {
  if (xpGainedNow <= 0) return currentStreak;

  const today = todayISO();
  const { data: todayRow } = await supabase
    .from('practice_daily_progress')
    .select('*')
    .eq('student_id', studentId)
    .eq('date', today)
    .maybeSingle();

  const wasGoalMet = todayRow?.goal_met ?? false;
  const newXpToday = (todayRow?.xp_earned ?? 0) + xpGainedNow;
  const isGoalMetNow = newXpToday >= DAILY_XP_GOAL;

  await supabase.from('practice_daily_progress').upsert({
    student_id: studentId,
    date: today,
    xp_earned: newXpToday,
    goal_met: isGoalMetNow,
  });

  if (!isGoalMetNow || wasGoalMet) return currentStreak;

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const { data: yesterdayRow } = await supabase
    .from('practice_daily_progress')
    .select('goal_met')
    .eq('student_id', studentId)
    .eq('date', yesterday.toISOString().slice(0, 10))
    .maybeSingle();

  return yesterdayRow?.goal_met ? currentStreak + 1 : 1;
}
