import { NextResponse } from 'next/server';

import { guard, isDenied } from '../../_lib/guard';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** Cuenta global de entregas de tareas todavía sin calificar — para la campana de notificaciones. */
export async function GET() {
  const result = await guard('assignment:grade');
  if (isDenied(result)) return result.response;

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ count: 0 });

  const { count, error } = await supabase
    .from('assignment_submissions')
    .select('id', { count: 'exact', head: true })
    .is('grade', null);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json({ count: count ?? 0 });
}
