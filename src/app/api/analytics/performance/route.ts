import { NextResponse } from 'next/server';

import { guard, isDenied } from '../../_lib/guard';
import { avatarColorFor } from '@/constants/palettes';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CEFR_LEVELS, type CefrLevel, type StudentPerformanceSummary } from '@/types';

export const runtime = 'nodejs';

const PAGE_SIZE = 20;

interface ProfileRow {
  id: string;
  full_name: string;
  enrollment_code: string | null;
  level: CefrLevel | null;
  avatar_color: string | null;
}

interface QuizAttemptRow {
  student_id: string;
  score: number;
  passed: boolean;
  created_at: string;
}

/**
 * Rendimiento acumulado por alumno (`quiz_attempts`), sólo para el módulo
 * de Reportes — es la única vista con detalle individual; el dashboard
 * general se queda con KPIs agregados.
 */
export async function GET(request: Request) {
  const result = await guard('report:read');
  if (isDenied(result)) return result.response;

  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() ?? '';
  const levelParam = url.searchParams.get('level');
  const level = CEFR_LEVELS.includes(levelParam as CefrLevel) ? (levelParam as CefrLevel) : null;
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase no disponible' }, { status: 503 });

  const from = (page - 1) * PAGE_SIZE;

  let profilesRequest = supabase
    .from('profiles')
    .select('id, full_name, enrollment_code, level, avatar_color', { count: 'exact' })
    .eq('role', 'student');

  if (level) profilesRequest = profilesRequest.eq('level', level);
  if (query) {
    const safe = query.replace(/[,()]/g, '').replace(/"/g, '""');
    const needle = `%${safe}%`;
    profilesRequest = profilesRequest.or(`full_name.ilike."${needle}",enrollment_code.ilike."${needle}"`);
  }

  const { data: profiles, count, error: profilesError } = await profilesRequest
    .order('full_name')
    .range(from, from + PAGE_SIZE - 1);

  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 });

  const rows = (profiles ?? []) as ProfileRow[];
  const studentIds = rows.map((row) => row.id);

  const attemptsByStudent = new Map<string, QuizAttemptRow[]>();
  if (studentIds.length > 0) {
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('student_id, score, passed, created_at')
      .in('student_id', studentIds);

    if (attemptsError) return NextResponse.json({ error: attemptsError.message }, { status: 500 });

    for (const attempt of (attempts ?? []) as QuizAttemptRow[]) {
      const existing = attemptsByStudent.get(attempt.student_id);
      if (existing) existing.push(attempt);
      else attemptsByStudent.set(attempt.student_id, [attempt]);
    }
  }

  const items: StudentPerformanceSummary[] = rows.map((row) => {
    const attempts = attemptsByStudent.get(row.id) ?? [];
    const attemptCount = attempts.length;
    const avgScore =
      attemptCount > 0
        ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attemptCount)
        : null;
    const passRate =
      attemptCount > 0
        ? Math.round((attempts.filter((a) => a.passed).length / attemptCount) * 100)
        : null;
    const lastAttemptAt =
      attemptCount > 0
        ? attempts.reduce((latest, a) => (a.created_at > latest ? a.created_at : latest), attempts[0]!.created_at)
        : null;

    return {
      id: row.id,
      name: row.full_name,
      enrollmentCode: row.enrollment_code ?? '—',
      level: row.level ?? 'A1',
      avatarColor: row.avatar_color ?? avatarColorFor(row.id),
      avgScore,
      passRate,
      attempts: attemptCount,
      lastAttemptAt,
    };
  });

  return NextResponse.json(
    { items, total: count ?? 0, page, pageSize: PAGE_SIZE },
    { headers: { 'Cache-Control': 'private, max-age=300' } },
  );
}
