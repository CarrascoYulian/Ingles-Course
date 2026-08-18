import { NextResponse } from 'next/server';

import { guard, isDenied } from '../../_lib/guard';
import { avatarColorFor } from '@/constants/palettes';
import { getInitials } from '@/lib/format';
import { IS_DEMO_MODE } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { DEMO_LEADERBOARD } from '@/services/demo/data';
import type { LeaderboardEntry } from '@/types';

export const runtime = 'nodejs';

interface EnrollmentWithProfile {
  completed_lessons: number;
  profiles: {
    id: string;
    full_name: string;
    enrollment_code: string | null;
    level: LeaderboardEntry['level'] | null;
    avatar_color: string | null;
  } | null;
}

export async function GET() {
  const result = await guard('report:read');
  if (isDenied(result)) return result.response;

  if (IS_DEMO_MODE) {
    return NextResponse.json(DEMO_LEADERBOARD, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase no disponible' }, { status: 503 });

  // Sin `.limit(5)` aquí a propósito: un alumno matriculado en varios
  // cursos tiene varias filas de `enrollments`, cada una con su propio
  // `completed_lessons` — pedir top 5 *filas* podía devolver al mismo
  // alumno dos veces (mismo `profiles.id` como key, React se quejaba de
  // keys duplicadas) y además dejaba afuera a alguien con más lecciones
  // completadas en total pero repartidas entre cursos. Se agrega por
  // alumno en JS y recién ahí se cortan los primeros 5.
  const { data, error } = await supabase
    .from('enrollments')
    .select('completed_lessons, profiles!inner(id, full_name, enrollment_code, level, avatar_color)');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as EnrollmentWithProfile[];
  const totalsByStudent = new Map<string, { profile: NonNullable<EnrollmentWithProfile['profiles']>; score: number }>();
  for (const row of rows) {
    if (!row.profiles) continue;
    const existing = totalsByStudent.get(row.profiles.id);
    if (existing) existing.score += row.completed_lessons;
    else totalsByStudent.set(row.profiles.id, { profile: row.profiles, score: row.completed_lessons });
  }

  const leaderboard: LeaderboardEntry[] = Array.from(totalsByStudent.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ profile, score }, index) => ({
      id: profile.id,
      rank: index + 1,
      name: profile.full_name,
      enrollmentCode: profile.enrollment_code ?? '—',
      level: profile.level ?? 'A1',
      score,
      avatarColor: profile.avatar_color ?? avatarColorFor(profile.id),
      initials: getInitials(profile.full_name),
    }));

  return NextResponse.json(leaderboard, { headers: { 'Cache-Control': 'private, max-age=300' } });
}
