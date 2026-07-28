import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';

import { DEMO_SESSION_COOKIE, verifyDemoSessionToken } from '@/lib/auth/demo-session';
import { DEMO_STUDENT, DEMO_TEACHER } from '@/services/demo/data';
import { IS_DEMO_MODE } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Profile } from '@/types';

/**
 * Perfil de la sesión actual.
 * `cache()` lo memoiza durante la petición: varios Server Components pueden
 * pedirlo sin generar consultas repetidas.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  if (IS_DEMO_MODE) {
    // El rol sale de la cookie firmada que deja /api/demo-auth/login. Sin
    // sesión demo iniciada, no hay perfil — antes esto devolvía siempre
    // DEMO_TEACHER y la app "abría directo como admin" sin pasar por login.
    const cookieStore = await cookies();
    const role = await verifyDemoSessionToken(cookieStore.get(DEMO_SESSION_COOKIE)?.value);
    if (role === 'student') return DEMO_STUDENT;
    if (role === 'admin' || role === 'instructor') return DEMO_TEACHER;
    return null;
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, role, full_name, enrollment_code, level, avatar_color')
    .eq('id', user.id)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    role: data.role,
    fullName: data.full_name,
    enrollmentCode: data.enrollment_code,
    level: data.level,
    avatarColor: data.avatar_color,
  };
});

/** Igual que `getCurrentProfile` pero lanza si no hay sesión. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('UNAUTHENTICATED');
  return profile;
}
