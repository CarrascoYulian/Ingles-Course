import { NextResponse } from 'next/server';
import { z } from 'zod';

import { badRequest, guard, isDenied } from '../../_lib/guard';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const requestSchema = z.object({
  fullName: z.string().trim().min(1),
  level: z.enum(['A1', 'A2', 'B1', 'B2']),
  password: z.string().min(6),
});

/**
 * Crea un estudiante con matrícula y clave asignadas por el maestro — sin
 * correo real. Guarda la clave únicamente en `auth.users` (hasheada por
 * Supabase); el correo que ve Auth es un correo interno sintético que nunca
 * recibe mensajes, sólo satisface el requisito estructural del proveedor.
 *
 * Requiere service role (crear usuarios salta RLS), por eso vive en el
 * servidor y no en el adaptador de navegador.
 */
export async function POST(request: Request) {
  const result = await guard('student:invite');
  if (isDenied(result)) return result.response;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest('Datos inválidos');

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'La creación de estudiantes no está configurada' }, { status: 503 });
  }

  // Antes se calculaba con `count(*) + 1`: dos invitaciones simultáneas
  // podían generar el mismo código y la segunda fallaba con un error de
  // restricción única confuso. La secuencia de Postgres es atómica.
  const { data: enrollmentCode, error: codeError } = await admin.rpc('next_enrollment_code');
  if (codeError || !enrollmentCode) {
    return NextResponse.json({ error: 'No se pudo generar el código de matrícula' }, { status: 500 });
  }
  const internalEmail = `${enrollmentCode.toLowerCase()}@alumnos.inglesconmetodo.internal`;

  const { error } = await admin.auth.admin.createUser({
    email: internalEmail,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.fullName,
      enrollment_code: enrollmentCode,
      role: 'student',
      level: parsed.data.level,
    },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json({ enrollmentCode });
}
