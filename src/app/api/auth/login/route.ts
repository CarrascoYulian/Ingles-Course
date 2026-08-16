import { NextResponse } from 'next/server';
import { z } from 'zod';

import { LANDING_BY_ROLE } from '@/constants/routes';
import { derivePinPassword } from '@/lib/auth/student-pin';
import { IS_DEMO_MODE } from '@/lib/env';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getSupabaseAdminClient, getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const requestSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});

/** Un PIN de 4 dígitos tiene mucha menos entropía que una contraseña — límite más estricto. */
const LOGIN_RATE_LIMIT = { limit: 8, windowMs: 60 * 1000 };

/**
 * Login real (Supabase). Acepta correo (personal docente) o matrícula
 * (alumnos). La matrícula se resuelve a su correo interno con el cliente de
 * service role — nunca se expone al navegador — y el sign-in real ocurre
 * aquí para poder escribir las cookies de sesión en la respuesta.
 */
export async function POST(request: Request) {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ error: 'Modo demo no disponible' }, { status: 404 });
  }

  const rate = checkRateLimit(`login:${getClientIp(request)}`, LOGIN_RATE_LIMIT);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Usuario o contraseña inválidos' }, { status: 400 });
  }

  const { identifier, password: submitted } = parsed.data;
  const genericError = () =>
    NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 });

  let email = identifier;
  // Alumno = matrícula + PIN de 4 dígitos, no correo + contraseña libre.
  // Lo que llega en `password` es el PIN; la contraseña real de Auth se
  // reconstruye igual que al crear la cuenta (ver `derivePinPassword`).
  let password = submitted;

  if (!identifier.includes('@')) {
    const admin = getSupabaseAdminClient();
    if (!admin) return genericError();

    const { data: profile } = await admin
      .from('profiles')
      .select('id, enrollment_code, is_active')
      .eq('enrollment_code', identifier)
      .eq('role', 'student')
      .maybeSingle();
    if (!profile?.enrollment_code) return genericError();
    // A propósito NO es el mensaje genérico: un alumno inactivo que ve
    // "contraseña incorrecta" prueba PINs distintos y termina escribiendo a
    // soporte por un "olvidé mi contraseña" que no tiene nada que ver — acá
    // el problema es la cuenta, no el PIN, así que hay que decirlo. Sí
    // revela que la matrícula existe, pero es un cambio consciente: la
    // claridad para el alumno pesa más que ese detalle en una app chica de
    // un solo curso, no un sistema con miles de cuentas para enumerar.
    if (!profile.is_active) {
      return NextResponse.json(
        { error: 'Tu cuenta está inactiva. Contacta a tu docente para reactivarla.' },
        { status: 403 },
      );
    }

    const { data: userResult } = await admin.auth.admin.getUserById(profile.id);
    if (!userResult?.user?.email) return genericError();
    email = userResult.user.email;
    password = derivePinPassword(profile.enrollment_code, submitted);
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return genericError();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  // Mensaje genérico a propósito: distinguir «usuario no existe» de
  // «contraseña incorrecta» permite enumerar matrículas/cuentas.
  if (error || !data.user) return genericError();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  const role = profile?.role ?? 'student';
  return NextResponse.json({ next: LANDING_BY_ROLE[role] });
}
