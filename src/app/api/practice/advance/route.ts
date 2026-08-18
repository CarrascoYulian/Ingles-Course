import { NextResponse } from 'next/server';

import { guard, isDenied } from '../../_lib/guard';
import { DEFAULT_TOTAL_STEPS, HEARTS_TOTAL } from '../_constants';
import { getMissions } from '../_missions';
import { computeAdvance } from '../logic';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** Avanza un paso dentro del nivel actual. */
export async function POST() {
  const result = await guard('practice:play');
  if (isDenied(result)) return result.response;

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
  }

  const [{ data: current }, { data: levels }] = await Promise.all([
    supabase.from('practice_progress').select('*').eq('student_id', result.profile.id).maybeSingle(),
    supabase.from('practice_levels').select('position, total_steps').order('position'),
  ]);

  const currentLevel = current?.current_level ?? 1;
  // Antes el tope de pasos era 10 fijo — un nivel con más o menos pasos
  // reales (`practice_levels.total_steps`) se quedaba mal acotado.
  const totalSteps =
    levels?.find((l) => l.position === currentLevel)?.total_steps ?? DEFAULT_TOTAL_STEPS;
  const hasNextLevel = levels?.some((l) => l.position === currentLevel + 1) ?? false;

  // Subir de nivel es un punto de control natural: los corazones se
  // recargan, igual que al iniciar un módulo nuevo en la mayoría de apps de
  // práctica gamificada. Ver `computeAdvance` para la regla completa.
  const { nextLevel, nextStep, nextHearts } = computeAdvance({
    currentStep: current?.current_step ?? 1,
    totalSteps,
    currentLevel,
    hasNextLevel,
    currentHearts: current?.hearts_remaining ?? HEARTS_TOTAL,
    heartsTotal: HEARTS_TOTAL,
  });

  const { data, error } = await supabase
    .from('practice_progress')
    .upsert({
      student_id: result.profile.id,
      xp: current?.xp ?? 0,
      coins: current?.coins ?? 0,
      streak_days: current?.streak_days ?? 0,
      current_level: nextLevel,
      current_step: nextStep,
      hearts_remaining: nextHearts,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const totalStepsForResponse =
    levels?.find((l) => l.position === data.current_level)?.total_steps ?? DEFAULT_TOTAL_STEPS;
  const missions = await getMissions(supabase, result.profile.id, data.xp);

  return NextResponse.json({
    levelId: `n${data.current_level}`,
    step: data.current_step,
    totalSteps: totalStepsForResponse,
    xp: data.xp,
    coins: data.coins,
    streak: data.streak_days,
    hearts: { total: HEARTS_TOTAL, remaining: data.hearts_remaining },
    missions,
  });
}
