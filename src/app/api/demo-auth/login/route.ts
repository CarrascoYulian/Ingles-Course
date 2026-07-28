import { NextResponse } from 'next/server';
import { z } from 'zod';

import { LANDING_BY_ROLE } from '@/constants/routes';
import { IS_DEMO_MODE } from '@/lib/env';
import {
  createDemoSessionToken,
  DEMO_SESSION_COOKIE,
  findDemoAccount,
} from '@/lib/auth/demo-session';

export const runtime = 'nodejs';

const requestSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

/**
 * Login del modo demo. Sólo existe mientras no haya Supabase configurado:
 * con Supabase presente, `IS_DEMO_MODE` es `false` y esta ruta devuelve 404
 * a propósito — el login real pasa por `supabase.auth.signInWithPassword`.
 */
export async function POST(request: Request) {
  if (!IS_DEMO_MODE) {
    return NextResponse.json({ error: 'Modo demo no disponible' }, { status: 404 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Correo o contraseña inválidos' }, { status: 400 });
  }

  const account = findDemoAccount(parsed.data.email, parsed.data.password);
  if (!account) {
    return NextResponse.json({ error: 'Correo o contraseña incorrectos' }, { status: 401 });
  }

  const response = NextResponse.json({ role: account.role, next: LANDING_BY_ROLE[account.role] });
  response.cookies.set(DEMO_SESSION_COOKIE, await createDemoSessionToken(account.role), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 horas, igual que una sesión de trabajo.
  });
  return response;
}
