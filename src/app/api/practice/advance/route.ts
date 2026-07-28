import { NextResponse } from 'next/server';

import { guard, isDenied } from '../../_lib/guard';
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

  const { data: current } = await supabase
    .from('practice_progress')
    .select('*')
    .eq('student_id', result.profile.id)
    .maybeSingle();

  const nextStep = Math.min(10, (current?.current_step ?? 1) + 1);

  const { data, error } = await supabase
    .from('practice_progress')
    .upsert({
      student_id: result.profile.id,
      xp: current?.xp ?? 0,
      coins: current?.coins ?? 0,
      streak_days: current?.streak_days ?? 0,
      current_level: current?.current_level ?? 1,
      current_step: nextStep,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    levelId: `n${data.current_level}`,
    step: data.current_step,
    totalSteps: 10,
    xp: data.xp,
    coins: data.coins,
    streak: data.streak_days,
    hearts: { total: 3, remaining: 1 },
  });
}
