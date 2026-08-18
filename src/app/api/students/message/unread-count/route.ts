import { NextResponse } from 'next/server';

import { guard, isDenied } from '../../../_lib/guard';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** Total de mensajes de alumnos sin leer por el docente — alimenta la
 * bolita de "Estudiantes" en el panel docente. */
export async function GET() {
  const result = await guard('student:read');
  if (isDenied(result)) return result.response;

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ count: 0 });

  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .is('read_by_staff_at', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ count: count ?? 0 });
}
