import { NextResponse } from 'next/server';
import { z } from 'zod';

import { LANDING_BY_ROLE } from '@/constants/routes';
import { IS_DEMO_MODE } from '@/lib/env';
import { getSupabaseAdminClient, getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const requestSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});

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

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Usuario o contraseña inválidos' }, { status: 400 });
  }

  const { identifier, password } = parsed.data;
  const genericError = () =>
    NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 });

  let email = identifier;

  if (!identifier.includes('@')) {
    const admin = getSupabaseAdminClient();
    if (!admin) return genericError();

    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('enrollment_code', identifier)
      .eq('role', 'student')
      .maybeSingle();
    if (!profile) return genericError();

    const { data: userResult } = await admin.auth.admin.getUserById(profile.id);
    if (!userResult?.user?.email) return genericError();
    email = userResult.user.email;
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
