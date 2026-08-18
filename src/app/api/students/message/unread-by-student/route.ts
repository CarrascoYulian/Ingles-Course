import { NextResponse } from 'next/server';

import { guard, isDenied } from '../../../_lib/guard';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** IDs de alumnos con al menos un mensaje sin leer por el docente — alimenta
 * la bolita sobre el nombre de cada estudiante en el panel. */
export async function GET() {
  const result = await guard('student:read');
  if (isDenied(result)) return result.response;

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ studentIds: [] });

  const { data, error } = await supabase
    .from('messages')
    .select('student_id')
    .is('read_by_staff_at', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const studentIds = [...new Set((data ?? []).map((row) => row.student_id))];
  return NextResponse.json({ studentIds });
}
