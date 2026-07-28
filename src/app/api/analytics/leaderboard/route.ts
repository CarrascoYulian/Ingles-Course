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

  const { data, error } = await supabase
    .from('enrollments')
    .select('completed_lessons, profiles!inner(id, full_name, enrollment_code, level, avatar_color)')
    .order('completed_lessons', { ascending: false })
    .limit(5);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as EnrollmentWithProfile[];
  const leaderboard: LeaderboardEntry[] = rows
    .filter((row) => row.profiles !== null)
    .map((row, index) => {
      const profile = row.profiles!;
      return {
        id: profile.id,
        rank: index + 1,
        name: profile.full_name,
        enrollmentCode: profile.enrollment_code ?? '—',
        level: profile.level ?? 'A1',
        score: row.completed_lessons,
        avatarColor: profile.avatar_color ?? avatarColorFor(profile.id),
        initials: getInitials(profile.full_name),
      };
    });

  return NextResponse.json(leaderboard, { headers: { 'Cache-Control': 'private, max-age=300' } });
}
