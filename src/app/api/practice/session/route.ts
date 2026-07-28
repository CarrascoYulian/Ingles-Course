import { NextResponse } from 'next/server';

import { guard, isDenied } from '../../_lib/guard';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { PracticeSession } from '@/types';

export const runtime = 'nodejs';

const DEFAULT_SESSION: PracticeSession = {
  levelId: 'n3',
  step: 6,
  totalSteps: 10,
  xp: 1240,
  coins: 340,
  streak: 12,
  hearts: { total: 3, remaining: 1 },
};

export async function GET() {
  const result = await guard('practice:play');
  if (isDenied(result)) return result.response;

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json(DEFAULT_SESSION);

  const { data } = await supabase
    .from('practice_progress')
    .select('xp, coins, streak_days, current_level, current_step')
    .eq('student_id', result.profile.id)
    .maybeSingle();

  if (!data) return NextResponse.json(DEFAULT_SESSION);

  return NextResponse.json({
    ...DEFAULT_SESSION,
    levelId: `n${data.current_level}`,
    step: data.current_step,
    xp: data.xp,
    coins: data.coins,
    streak: data.streak_days,
  } satisfies PracticeSession);
}
