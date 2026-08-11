import { NextResponse } from 'next/server';
import { z } from 'zod';

import { badRequest, guard, isDenied } from '../../_lib/guard';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const requestSchema = z.object({
  studentId: z.string().min(1),
  body: z.string().trim().min(1).max(2000),
});

/**
 * Envía un mensaje del docente a un estudiante.
 *
 * Antes esto era un no-op: validaba la petición y devolvía `ok: true` sin
 * guardar nada. Ahora inserta en `messages` (0007_messages.sql).
 */
/**
 * Historial de mensajes con un estudiante — antes no existía ningún lugar
 * para verlos: el docente los enviaba a ciegas y no tenía forma de
 * confirmar que se guardaron ni de ver respuestas previas.
 */
export async function GET(request: Request) {
  const result = await guard('student:read');
  if (isDenied(result)) return result.response;

  const studentId = new URL(request.url).searchParams.get('studentId');
  if (!studentId) return badRequest('Falta el parámetro «studentId»');

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json([]);

  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, body, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data ?? []).map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      fromStaff: row.sender_id !== studentId,
    })),
  );
}

export async function POST(request: Request) {
  const result = await guard('student:read');
  if (isDenied(result)) return result.response;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest('Mensaje inválido');

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: true }); // modo demo: no hay tabla que escribir

  const { error } = await supabase.from('messages').insert({
    sender_id: result.profile.id,
    student_id: parsed.data.studentId,
    body: parsed.data.body,
    read_at: null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
