import { NextResponse } from 'next/server';

import { forbidden, guard, isDenied } from '../../_lib/guard';
import { logAuditEvent } from '@/lib/audit';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Borra la cuenta del staff de Auth. `profiles.id` referencia
 * `auth.users(id) on delete cascade`, así que borrar acá basta — y libera
 * el correo, que si no queda "atado" a un usuario desactivado y no se
 * puede volver a invitar (Supabase responde "ya registrado").
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await guard('staff:invite');
  if (isDenied(result)) return result.response;
  if (!result.profile.isSuperAdmin) {
    return forbidden('Sólo el dueño de la cuenta puede eliminar administradores');
  }

  const { id } = await params;
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'La eliminación de staff no está configurada' }, { status: 503 });
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('role, full_name, is_super_admin')
    .eq('id', id)
    .single();
  if (!profile || profile.role === 'student') {
    return NextResponse.json({ error: 'Miembro del staff no encontrado' }, { status: 404 });
  }

  if (id === result.profile.id || profile.is_super_admin) {
    return NextResponse.json({ error: 'No se puede eliminar al dueño de la cuenta' }, { status: 400 });
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  await logAuditEvent(result.profile, 'delete', 'staff', id, profile.full_name);

  return NextResponse.json({ ok: true });
}
