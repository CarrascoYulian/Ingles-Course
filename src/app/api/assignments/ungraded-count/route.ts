import { NextResponse } from 'next/server';

import { guard, isDenied } from '../../_lib/guard';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Cuenta global de entregas de tareas todavía sin calificar — para la
 * campana de notificaciones. Además ubica la entrega más antigua sin
 * calificar (curso + módulo) para que la notificación pueda llevar directo
 * ahí en vez de a una página genérica.
 */
export async function GET() {
  const result = await guard('assignment:grade');
  if (isDenied(result)) return result.response;

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ count: 0, target: null });

  const { count, error } = await supabase
    .from('assignment_submissions')
    .select('id', { count: 'exact', head: true })
    .is('grade', null);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  const { data: oldest, error: oldestError } = await supabase
    .from('assignment_submissions')
    .select('assignments(module_id, modules(course_id))')
    .is('grade', null)
    .order('submitted_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (oldestError) return NextResponse.json({ error: oldestError.message }, { status: 502 });

  const oldestRow = oldest as unknown as {
    assignments: { module_id: string; modules: { course_id: string } | null } | null;
  } | null;
  const assignment = oldestRow?.assignments;
  const target =
    assignment && assignment.modules
      ? { courseId: assignment.modules.course_id, moduleId: assignment.module_id }
      : null;

  return NextResponse.json({ count: count ?? 0, target });
}
