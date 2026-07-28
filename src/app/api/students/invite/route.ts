import { NextResponse } from 'next/server';
import { z } from 'zod';

import { badRequest, guard, isDenied } from '../../_lib/guard';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const requestSchema = z.object({ email: z.string().email() });

/**
 * Invita a un estudiante y le asigna matrícula.
 *
 * Requiere service role (crear usuarios salta RLS), por eso vive en el
 * servidor y no en el adaptador de navegador.
 */
export async function POST(request: Request) {
  const result = await guard('student:invite');
  if (isDenied(result)) return result.response;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest('Correo inválido');

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'La invitación por correo no está configurada' },
      { status: 503 },
    );
  }

  const { count } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student');

  const enrollmentCode = `ING-${String((count ?? 0) + 1).padStart(6, '0')}`;

  const { error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { enrollment_code: enrollmentCode, role: 'student' },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json({ enrollmentCode });
}
