import { NextResponse } from 'next/server';

import { guard, isDenied } from '../../_lib/guard';
import { IS_DEMO_MODE } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { DEMO_METRICS } from '@/services/demo/data';
import type { DashboardMetrics } from '@/types';

export const runtime = 'nodejs';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WEEKS = 8;

/**
 * Métricas del panel.
 *
 * Antes devolvía siempre `DEMO_METRICS`, incluso con Supabase configurado.
 * Ahora, fuera del modo demo, agrega datos reales de `profiles`,
 * `enrollments`, `courses`, `modules`, `lessons` y `lesson_progress`.
 *
 * No hay tabla de snapshots históricos, así que las variaciones ("+12,4 %")
 * del diseño original no se pueden calcular honestamente todavía — se
 * omiten (`deltaLabel: ''`) en vez de inventar un número.
 *
 * TODO(supabase): una vista materializada refrescada cada 5 min evitaría
 * recalcular estos agregados en cada visita al dashboard.
 */
export async function GET() {
  const result = await guard('report:read');
  if (isDenied(result)) return result.response;

  if (IS_DEMO_MODE) {
    return NextResponse.json(DEMO_METRICS, { headers: { 'Cache-Control': 'private, max-age=240' } });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase no disponible' }, { status: 503 });

  const [students, activeStudentsCount, enrollments, courses, modules, videos, drafts, lessonDates] =
    await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')
        .eq('is_active', true),
      supabase.from('enrollments').select('progress, watched_minutes'),
      supabase.from('courses').select('*', { count: 'exact', head: true }),
      supabase.from('modules').select('*', { count: 'exact', head: true }),
      supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'Video'),
      supabase.from('courses').select('*', { count: 'exact', head: true }).eq('published', false),
      supabase
        .from('lesson_progress')
        .select('completed_at')
        .not('completed_at', 'is', null)
        .gte('completed_at', new Date(Date.now() - WEEKS * 2 * WEEK_MS).toISOString()),
    ]);

  const total = students.count ?? 0;
  const active = activeStudentsCount.count ?? 0;
  const ratio = total > 0 ? Math.round((active / total) * 100) : 0;

  const enrollmentRows = enrollments.data ?? [];
  const averageProgress =
    enrollmentRows.length > 0
      ? Math.round(
          enrollmentRows.reduce((sum, row) => sum + row.progress, 0) / enrollmentRows.length,
        )
      : 0;
  const totalWatchedMinutes = enrollmentRows.reduce((sum, row) => sum + row.watched_minutes, 0);

  // Cuenta finalizaciones de lección por semana, últimas 8 vs. las 8 previas.
  const now = Date.now();
  const bucketOf = (iso: string) => Math.floor((now - new Date(iso).getTime()) / WEEK_MS);
  const counts = new Array(WEEKS * 2).fill(0);
  for (const row of lessonDates.data ?? []) {
    if (!row.completed_at) continue;
    const bucket = bucketOf(row.completed_at);
    if (bucket >= 0 && bucket < counts.length) counts[bucket] += 1;
  }
  const currentWeeks = counts.slice(0, WEEKS).reverse();
  const previousWeeks = counts.slice(WEEKS, WEEKS * 2).reverse();
  const maxCount = Math.max(1, ...currentWeeks, ...previousWeeks);
  const weeklyLessons = currentWeeks.map((count, index) => ({
    label: `Sem ${index + 1}`,
    current: Math.round((count / maxCount) * 100),
    previous: Math.round(((previousWeeks[index] ?? 0) / maxCount) * 100),
  }));

  const metrics: DashboardMetrics = {
    activeStudents: {
      value: active,
      deltaLabel: '',
      ratio,
      caption: `${ratio} % del total · ${total - active} inactivos`,
    },
    averageProgress: {
      value: averageProgress,
      deltaLabel: '',
      caption: 'Meta configurada: 70 %',
    },
    watchedHours: {
      value: Math.round(totalWatchedMinutes / 60).toLocaleString('es-DO'),
      deltaLabel: '',
      sparkline: currentWeeks.map((count) => Math.round((count / maxCount) * 100)),
    },
    library: {
      courses: courses.count ?? 0,
      modules: modules.count ?? 0,
      videos: videos.count ?? 0,
      drafts: drafts.count ?? 0,
    },
    weeklyLessons,
    totalStudents: total,
  };

  return NextResponse.json(metrics, { headers: { 'Cache-Control': 'private, max-age=240' } });
}
