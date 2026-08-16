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
const PAGE_SIZE = 50;

/**
 * Historial de mensajes con un estudiante — antes no existía ningún lugar
 * para verlos: el docente los enviaba a ciegas y no tenía forma de
 * confirmar que se guardaron ni de ver respuestas previas.
 *
 * Paginado por cursor (`before`, la fecha del mensaje más viejo ya
 * cargado): antes el `limit(50)` cortaba en seco sin forma de ver nada
 * anterior — una conversación larga perdía contexto real en silencio.
 */
export async function GET(request: Request) {
  const result = await guard('student:read');
  if (isDenied(result)) return result.response;

  const url = new URL(request.url);
  const studentId = url.searchParams.get('studentId');
  if (!studentId) return badRequest('Falta el parámetro «studentId»');
  const before = url.searchParams.get('before');

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ items: [], nextCursor: null });

  let query = supabase
    .from('messages')
    .select('id, sender_id, body, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (before) query = query.lt('created_at', before);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  return NextResponse.json({
    items: rows.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      fromStaff: row.sender_id !== studentId,
    })),
    // Si la página vino llena, puede haber más — el cursor de la próxima
    // página es la fecha del mensaje más viejo de ESTA.
    nextCursor: rows.length === PAGE_SIZE ? rows[rows.length - 1]!.created_at : null,
  });
}

export async function POST(request: Request) {
  // Enviar es una capacidad distinta de leer — antes compartía `student:read`,
  // así que cualquiera con permiso de sólo lectura podía escribir mensajes
  // en nombre del staff.
  const result = await guard('student:message');
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
    read_by_staff_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

const patchSchema = z.object({ studentId: z.string().min(1) });

/**
 * Marca como leídos (por el docente) todos los mensajes de un alumno que
 * él mismo escribió — se llama al abrir el hilo de ese alumno en el panel
 * docente, análogo a `markMessageRead` del lado del alumno.
 */
export async function PATCH(request: Request) {
  const result = await guard('student:read');
  if (isDenied(result)) return result.response;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest('Falta el «studentId»');

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: true });

  const { error } = await supabase
    .from('messages')
    .update({ read_by_staff_at: new Date().toISOString() })
    .eq('student_id', parsed.data.studentId)
    .is('read_by_staff_at', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
