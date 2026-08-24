import { NextResponse } from 'next/server';

import { badRequest, guard, isDenied } from '../../_lib/guard';
import { IS_DEMO_MODE } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { DEMO_REPORT_BARS } from '@/services/demo/data';
import type { ReportRange, ReportSnapshot } from '@/types';

export const runtime = 'nodejs';

const RANGES: ReportRange[] = ['7 días', '30 días', 'Trimestre', 'Año'];
const RANGE_CONFIG: Record<ReportRange, { days: number; buckets: number }> = {
  '7 días': { days: 7, buckets: 7 },
  '30 días': { days: 30, buckets: 7 },
  Trimestre: { days: 90, buckets: 7 },
  Año: { days: 365, buckets: 7 },
};

/**
 * Antes devolvía siempre las mismas barras y el mismo texto fijos
 * (`DEMO_REPORT_BARS`, "4.8 Evaluación del módulo"…), incluso con Supabase
 * configurado. Ahora agrega `lesson_progress.completed_at` real dentro del
 * rango elegido, y calcula la lección con más abandono contando cuántos
 * estudiantes la completaron frente al total de matrículas del curso.
 */
export async function GET(request: Request) {
  const result = await guard('report:read');
  if (isDenied(result)) return result.response;

  const raw = new URL(request.url).searchParams.get('range') ?? '30 días';
  if (!RANGES.includes(raw as ReportRange)) return badRequest('Rango no válido');
  const range = raw as ReportRange;

  if (IS_DEMO_MODE) {
    const snapshot: ReportSnapshot = {
      range,
      bars: DEMO_REPORT_BARS[range],
      retention: { value: '91 %', delta: '+2,4 pts vs. periodo anterior' },
      dropOff: { lesson: '4.8 Evaluación de la unidad', rate: '32 % la deja sin terminar' },
      recommendation:
        'Divide la evaluación 4.8 en dos partes: el abandono se concentra después del minuto 12.',
    };
    return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'private, max-age=300' } });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase no disponible' }, { status: 503 });

  const { days, buckets } = RANGE_CONFIG[range];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    { data: completions },
    { count: totalStudents },
    activeStudentsResult,
    { data: lessons },
    { data: allCompletions },
    { count: enrollmentCount },
  ] = await Promise.all([
    supabase
      .from('lesson_progress')
      .select('completed_at')
      .not('completed_at', 'is', null)
      .gte('completed_at', since.toISOString()),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student')
      .eq('is_active', true),
    supabase.from('lessons').select('id, title'),
    // Sin fecha límite: la tasa de abandono es una foto del estado actual,
    // no del rango seleccionado.
    supabase.from('lesson_progress').select('lesson_id').not('completed_at', 'is', null),
    supabase.from('enrollments').select('*', { count: 'exact', head: true }),
  ]);

  const bucketMs = (days * 24 * 60 * 60 * 1000) / buckets;
  const counts = new Array(buckets).fill(0);
  for (const row of completions ?? []) {
    if (!row.completed_at) continue;
    const age = Date.now() - new Date(row.completed_at).getTime();
    const bucket = buckets - 1 - Math.min(buckets - 1, Math.floor(age / bucketMs));
    counts[bucket] += 1;
  }
  const maxCount = Math.max(1, ...counts);
  const bars = counts.map((count) => Math.round((count / maxCount) * 100));

  const total = totalStudents ?? 0;
  const active = activeStudentsResult.count ?? 0;
  const retentionValue = total > 0 ? Math.round((active / total) * 100) : 0;

  // Lección con más abandono: la que menos completó, comparada contra el
  // total de matrículas activas — una tasa real, aunque aproximada (no hay
  // evento de "lección empezada" para medir el abandono exacto, sólo el de
  // finalización).
  const completedByLesson = new Map<string, number>();
  for (const row of allCompletions ?? []) {
    completedByLesson.set(row.lesson_id, (completedByLesson.get(row.lesson_id) ?? 0) + 1);
  }

  let dropOffLesson: { title: string; rate: number } | null = null;
  const enrollments = Math.max(1, enrollmentCount ?? 0);
  for (const lesson of lessons ?? []) {
    const completedCount = completedByLesson.get(lesson.id) ?? 0;
    const rate = Math.round((1 - completedCount / enrollments) * 100);
    if (!dropOffLesson || rate > dropOffLesson.rate) dropOffLesson = { title: lesson.title, rate };
  }

  const snapshot: ReportSnapshot = {
    range,
    bars,
    retention: { value: `${retentionValue} %`, delta: '' },
    dropOff: {
      lesson: dropOffLesson?.title ?? 'Sin lecciones publicadas todavía',
      rate: dropOffLesson ? `${Math.max(0, dropOffLesson.rate)} % no la ha completado` : '—',
    },
    recommendation: dropOffLesson
      ? `Revisa “${dropOffLesson.title}”: es la lección con menor tasa de finalización.`
      : 'Aún no hay suficiente historial para recomendar un cambio concreto.',
  };

  return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'private, max-age=300' } });
}
