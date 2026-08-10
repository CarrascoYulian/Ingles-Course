import { NextResponse } from 'next/server';

import { guard, isDenied } from '../../_lib/guard';
import { DEFAULT_TOTAL_STEPS, HEARTS_TOTAL } from '../_constants';
import { DEMO_MISSIONS, getMissions } from '../_missions';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { PracticeSession } from '@/types';

export const runtime = 'nodejs';

/** Fixture del modo demo — nunca se sirve fuera de él. */
const DEMO_SESSION: PracticeSession = {
  levelId: 'n3',
  step: 6,
  totalSteps: DEFAULT_TOTAL_STEPS,
  xp: 1240,
  coins: 340,
  streak: 12,
  hearts: { total: HEARTS_TOTAL, remaining: 1 },
  missions: DEMO_MISSIONS,
};

export async function GET() {
  const result = await guard('practice:play');
  if (isDenied(result)) return result.response;

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json(DEMO_SESSION);

  const [{ data: progress }, { data: levels }] = await Promise.all([
    supabase
      .from('practice_progress')
      .select('xp, coins, streak_days, current_level, current_step, hearts_remaining')
      .eq('student_id', result.profile.id)
      .maybeSingle(),
    supabase.from('practice_levels').select('position, total_steps').order('position'),
  ]);

  const currentLevel = progress?.current_level ?? 1;
  const totalSteps =
    levels?.find((l) => l.position === currentLevel)?.total_steps ?? DEFAULT_TOTAL_STEPS;
  const missions = await getMissions(supabase, result.profile.id, progress?.xp ?? 0);

  // Antes, sin fila de progreso (alumno recién creado), se devolvía el
  // fixture de demo tal cual — XP 1240 y racha de 12 para alguien que nunca
  // jugó. Ahora un alumno nuevo arranca de verdad en cero.
  if (!progress) {
    return NextResponse.json({
      levelId: `n${currentLevel}`,
      step: 1,
      totalSteps,
      xp: 0,
      coins: 0,
      streak: 0,
      hearts: { total: HEARTS_TOTAL, remaining: HEARTS_TOTAL },
      missions,
    } satisfies PracticeSession);
  }

  return NextResponse.json({
    levelId: `n${progress.current_level}`,
    step: progress.current_step,
    totalSteps,
    xp: progress.xp,
    coins: progress.coins,
    streak: progress.streak_days,
    hearts: { total: HEARTS_TOTAL, remaining: progress.hearts_remaining },
    missions,
  } satisfies PracticeSession);
}
