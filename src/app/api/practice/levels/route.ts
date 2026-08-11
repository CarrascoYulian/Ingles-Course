import { NextResponse } from 'next/server';

import { guard, isDenied } from '../../_lib/guard';
import { IS_DEMO_MODE } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { DEMO_PRACTICE_LEVELS } from '@/services/demo/data';
import type { PracticeLevel } from '@/types';

export const runtime = 'nodejs';

/**
 * Antes devolvía siempre `DEMO_PRACTICE_LEVELS`. Ahora, fuera del modo demo,
 * combina el catálogo real (`practice_levels`) con el avance guardado del
 * usuario (`practice_progress`) para calcular qué nivel está hecho, cuál
 * está en curso y cuáles siguen bloqueados.
 */
export async function GET() {
  const result = await guard('practice:play');
  if (isDenied(result)) return result.response;

  if (IS_DEMO_MODE) {
    return NextResponse.json(DEMO_PRACTICE_LEVELS);
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase no disponible' }, { status: 503 });

  const { data: progress, error: progressError } = await supabase
    .from('practice_progress')
    .select('current_level, current_step')
    .eq('student_id', result.profile.id)
    .maybeSingle();

  if (progressError) return NextResponse.json({ error: progressError.message }, { status: 500 });

  const currentLevel = progress?.current_level ?? 1;
  const currentStep = progress?.current_step ?? 1;

  // Con 500 niveles posibles, devolverlos todos convertiría la ruta de
  // niveles en una lista de 500 filas (y la mandaría entera al navegador).
  // Se acota a una ventana alrededor del nivel actual — igual que sólo se
  // ve un tramo del camino en Duolingo, no el árbol completo.
  const WINDOW_BEFORE = 5;
  const WINDOW_AFTER = 20;
  const { data: levels, error: levelsError } = await supabase
    .from('practice_levels')
    .select('*')
    .gte('position', Math.max(1, currentLevel - WINDOW_BEFORE))
    .lte('position', currentLevel + WINDOW_AFTER)
    .order('position');

  if (levelsError) return NextResponse.json({ error: levelsError.message }, { status: 500 });

  const response: PracticeLevel[] = (levels ?? []).map((level) => {
    const state: PracticeLevel['state'] =
      level.position < currentLevel ? 'done' : level.position === currentLevel ? 'current' : 'locked';
    return {
      id: level.id,
      order: level.position,
      title: level.title,
      state,
      xp: state === 'done' ? level.xp_reward : null,
      totalSteps: level.total_steps,
      completedSteps: state === 'done' ? level.total_steps : state === 'current' ? currentStep : 0,
    };
  });

  return NextResponse.json(response);
}
