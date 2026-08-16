import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { DEMO_SESSION_COOKIE, verifyDemoSessionToken } from '@/lib/auth/demo-session';
import { clientEnv, IS_DEMO_MODE } from '@/lib/env';
import type { Database, UserRole } from '@/types';

export interface SessionCheck {
  response: NextResponse;
  userId: string | null;
  role: UserRole | null;
}

/**
 * Refresca la sesión y resuelve el rol en el edge.
 * Devuelve la respuesta con las cookies ya actualizadas: el llamante debe
 * reutilizarla (o copiar sus cookies) para no perder el refresh token.
 */
export async function updateSession(request: NextRequest): Promise<SessionCheck> {
  let response = NextResponse.next({ request });

  if (IS_DEMO_MODE) {
    // Sin backend no hay sesión que refrescar: el rol sale de la cookie de
    // demo firmada en /api/demo-auth/login. Sin cookie válida, no hay
    // sesión — la app YA NO entra directo como admin.
    const role = await verifyDemoSessionToken(request.cookies.get(DEMO_SESSION_COOKIE)?.value);
    return { response, userId: role ? 'demo-user' : null, role };
  }

  const supabase = createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL!,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() revalida contra el servidor de Auth. getSession() lee la cookie
  // sin verificar y no debe usarse para decisiones de autorización.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { response, userId: null, role: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  // Un alumno desactivado a mitad de sesión pierde el acceso en la próxima
  // navegación, no sólo en el próximo login — "pausar" de verdad, no sólo
  // bloquear la puerta de entrada.
  if (profile?.role === 'student' && !profile.is_active) {
    await supabase.auth.signOut();
    return { response, userId: null, role: null };
  }

  return { response, userId: user.id, role: profile?.role ?? null };
}
