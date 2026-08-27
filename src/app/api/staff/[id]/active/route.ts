import { NextResponse } from 'next/server';
import { z } from 'zod';

import { badRequest, guard, isDenied } from '../../../_lib/guard';
import { logAuditEvent } from '@/lib/audit';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const activeSchema = z.object({ active: z.boolean() });

/**
 * Pausa/reactiva a un miembro del staff — mismo mecanismo que
 * `students/[id]/active`: sólo `profiles.is_active`, que ya bloquea el
 * login (ver `src/app/api/auth/login/route.ts`).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await guard('staff:invite');
  if (isDenied(result)) return result.response;

  const { id } = await params;
  const parsed = activeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest('Datos inválidos');

  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'No configurado' }, { status: 503 });

  const { data: profile } = await admin
    .from('profiles')
    .select('role, full_name')
    .eq('id', id)
    .single();
  if (!profile || profile.role === 'student') {
    return NextResponse.json({ error: 'Miembro del staff no encontrado' }, { status: 404 });
  }

  const { error } = await admin
    .from('profiles')
    .update({ is_active: parsed.data.active })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  await logAuditEvent(
    result.profile,
    parsed.data.active ? 'activate' : 'deactivate',
    'staff',
    id,
    profile.full_name,
  );

  return NextResponse.json({ ok: true });
}
