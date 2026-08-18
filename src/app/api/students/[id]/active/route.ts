import { NextResponse } from 'next/server';
import { z } from 'zod';

import { badRequest, guard, isDenied } from '../../../_lib/guard';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const activeSchema = z.object({ active: z.boolean() });

/**
 * Pausa/reactiva a un estudiante. No toca Auth ni el PIN: sólo
 * `profiles.is_active`, que ya bloquea escritura vía RLS
 * (`is_active_student()`) y que el login y el middleware usan para negar
 * sesión — ver `src/app/api/auth/login/route.ts` y
 * `src/lib/supabase/middleware.ts`.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await guard('student:update');
  if (isDenied(result)) return result.response;

  const { id } = await params;
  const parsed = activeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest('Datos inválidos');

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Esta acción no está configurada' }, { status: 503 });
  }

  const { data: profile } = await admin.from('profiles').select('role').eq('id', id).single();
  if (!profile || profile.role !== 'student') {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 });
  }

  const { error } = await admin
    .from('profiles')
    .update({ is_active: parsed.data.active })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json({ ok: true });
}
