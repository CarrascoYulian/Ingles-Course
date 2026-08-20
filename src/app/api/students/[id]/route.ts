import { NextResponse } from 'next/server';
import { z } from 'zod';

import { badRequest, guard, isDenied } from '../../_lib/guard';
import { derivePinPassword } from '@/lib/auth/student-pin';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const updateSchema = z.object({
  fullName: z.string().trim().min(1),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1']),
  pin: z.string().regex(/^\d{4}$/).optional().or(z.literal('')),
});

/**
 * Edita nombre/nivel y, opcionalmente, resetea el PIN de un estudiante ya
 * existente. Igual que en la invitación, la contraseña real en Auth se
 * deriva de matrícula+PIN — nunca se guarda el PIN solo.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await guard('student:update');
  if (isDenied(result)) return result.response;

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest('Datos inválidos');

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'La edición de estudiantes no está configurada' }, { status: 503 });
  }

  const { data: profile, error: fetchError } = await admin
    .from('profiles')
    .select('enrollment_code, role')
    .eq('id', id)
    .single();
  if (fetchError || !profile || profile.role !== 'student') {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 });
  }

  const { error: profileError } = await admin
    .from('profiles')
    .update({ full_name: parsed.data.fullName, level: parsed.data.level })
    .eq('id', id);
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 502 });

  if (parsed.data.pin) {
    if (!profile.enrollment_code) {
      return NextResponse.json({ error: 'El estudiante no tiene matrícula asignada' }, { status: 409 });
    }
    const { error: authError } = await admin.auth.admin.updateUserById(id, {
      password: derivePinPassword(profile.enrollment_code, parsed.data.pin),
      user_metadata: { full_name: parsed.data.fullName, level: parsed.data.level },
    });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 502 });
  } else {
    await admin.auth.admin.updateUserById(id, {
      user_metadata: { full_name: parsed.data.fullName, level: parsed.data.level },
    });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Borra al estudiante de Auth. `profiles.id` referencia `auth.users(id) on
 * delete cascade`, y cada tabla dependiente (enrollments, lesson_progress,
 * student_badges, practice_progress, messages, practice_daily_progress)
 * referencia `profiles(id) on delete cascade` — borrar aquí basta para que
 * Postgres borre en cascada todos los datos reales del alumno.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await guard('student:delete');
  if (isDenied(result)) return result.response;

  const { id } = await params;
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'La eliminación de estudiantes no está configurada' }, { status: 503 });
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', id)
    .single();
  if (!profile || profile.role !== 'student') {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 });
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json({ ok: true });
}
