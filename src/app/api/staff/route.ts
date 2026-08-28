import { NextResponse } from 'next/server';

import { guard, isDenied } from '../_lib/guard';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Lista el equipo docente (admin + instructor). El email no vive en
 * `profiles` (sólo en `auth.users`), así que se cruza con
 * `admin.auth.admin.listUsers()` — la lista de staff es chica, no hace
 * falta paginar.
 */
export async function GET() {
  const result = await guard('staff:read');
  if (isDenied(result)) return result.response;

  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'No configurado' }, { status: 503 });

  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, full_name, role, is_active, is_super_admin, created_at')
    .in('role', ['admin', 'instructor'])
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  const { data: usersPage, error: usersError } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 502 });

  const emailById = new Map(usersPage.users.map((u) => [u.id, u.email ?? '']));

  const staff = profiles.map((p) => ({
    id: p.id,
    fullName: p.full_name,
    email: emailById.get(p.id) ?? '',
    role: p.role,
    isActive: p.is_active,
    isSuperAdmin: p.is_super_admin,
    createdAt: p.created_at,
  }));

  return NextResponse.json({ staff });
}
