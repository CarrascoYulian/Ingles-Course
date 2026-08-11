import { NextResponse } from 'next/server';

import { guard, isDenied } from '../../../_lib/guard';
import { IS_DEMO_MODE } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

/**
 * Exportación real de progreso por estudiante — antes el botón "Exportar
 * CSV" sólo mostraba un toast de éxito falso, sin generar ningún archivo.
 */
export async function GET() {
  const result = await guard('report:export');
  if (isDenied(result)) return result.response;

  const today = new Date().toISOString().slice(0, 10);
  const filename = `reportes-${today}.csv`;

  if (IS_DEMO_MODE) {
    const csv = toCsv([
      ['matrícula', 'nombre', 'email', 'curso', '% progreso', 'última actividad'],
      ['ING-000001', 'Estudiante demo', 'estudiante@inglesconmetodo.demo', 'Curso demo', '54', today],
    ]);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase no disponible' }, { status: 503 });

  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('progress, student_id, profiles(full_name, enrollment_code), courses(name)')
    .order('progress', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const studentIds = [...new Set((enrollments ?? []).map((row) => row.student_id))];
  const { data: lastActivityRows } = await supabase
    .from('lesson_progress')
    .select('student_id, completed_at')
    .in('student_id', studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000'])
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false });

  const lastActivityByStudent = new Map<string, string>();
  for (const row of lastActivityRows ?? []) {
    if (!lastActivityByStudent.has(row.student_id) && row.completed_at) {
      lastActivityByStudent.set(row.student_id, row.completed_at);
    }
  }

  const rows: (string | number)[][] = [
    ['matrícula', 'nombre', 'email', 'curso', '% progreso', 'última actividad'],
  ];

  for (const row of enrollments ?? []) {
    const profile = (row as unknown as { profiles: { full_name: string; enrollment_code: string | null } | null })
      .profiles;
    const course = (row as unknown as { courses: { name: string } | null }).courses;
    if (!profile) continue;

    const enrollmentCode = profile.enrollment_code ?? '—';
    const email = profile.enrollment_code
      ? `${profile.enrollment_code.toLowerCase()}@alumnos.inglesconmetodo.internal`
      : '—';
    const lastActivity = lastActivityByStudent.get(row.student_id);

    rows.push([
      enrollmentCode,
      profile.full_name,
      email,
      course?.name ?? '—',
      Math.round(row.progress),
      lastActivity ? lastActivity.slice(0, 10) : 'Sin actividad registrada',
    ]);
  }

  return new NextResponse(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
