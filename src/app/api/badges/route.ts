import { NextResponse } from 'next/server';

import { guard, isDenied } from '../_lib/guard';
import { IS_DEMO_MODE } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { DEMO_BADGES } from '@/services/demo/data';
import type { Badge } from '@/types';

export const runtime = 'nodejs';

/**
 * Insignias del alumno.
 *
 * Antes devolvía siempre `DEMO_BADGES`, incluso con Supabase configurado.
 * Ahora, fuera del modo demo, hace un LEFT JOIN real contra
 * `student_badges` para saber cuáles obtuvo el usuario que hace la petición.
 */
export async function GET() {
  const result = await guard('course:read');
  if (isDenied(result)) return result.response;

  if (IS_DEMO_MODE) {
    return NextResponse.json(DEMO_BADGES, { headers: { 'Cache-Control': 'private, max-age=120' } });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase no disponible' }, { status: 503 });

  const [{ data: badges, error: badgesError }, { data: earned, error: earnedError }] =
    await Promise.all([
      supabase.from('badges').select('*').order('position'),
      supabase.from('student_badges').select('badge_id').eq('student_id', result.profile.id),
    ]);

  if (badgesError) return NextResponse.json({ error: badgesError.message }, { status: 500 });
  if (earnedError) return NextResponse.json({ error: earnedError.message }, { status: 500 });

  const earnedIds = new Set((earned ?? []).map((row) => row.badge_id));
  const response: Badge[] = (badges ?? []).map((badge) => ({
    id: badge.id,
    name: badge.name,
    state: earnedIds.has(badge.id) ? 'Obtenida' : badge.requirement,
    earned: earnedIds.has(badge.id),
  }));

  return NextResponse.json(response, { headers: { 'Cache-Control': 'private, max-age=120' } });
}
