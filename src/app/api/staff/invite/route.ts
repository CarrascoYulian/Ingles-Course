import { NextResponse } from 'next/server';
import { z } from 'zod';

import { badRequest, forbidden, guard, isDenied } from '../../_lib/guard';
import { logAuditEvent } from '@/lib/audit';
import { clientEnv } from '@/lib/env';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const requestSchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().trim().email(),
});

/**
 * Invita a otro administrador por correo real — a diferencia de
 * estudiantes (correo interno sintético + PIN), acá sí hay una casilla
 * real detrás: Supabase manda el email de invitación con el link para
 * elegir contraseña. El trigger de `0001_schema.sql` crea la fila en
 * `profiles` leyendo `role` de `user_metadata`, igual que con estudiantes.
 */
export async function POST(request: Request) {
  const result = await guard('staff:invite');
  if (isDenied(result)) return result.response;
  if (!result.profile.isSuperAdmin) {
    return forbidden('Sólo el dueño de la cuenta puede invitar administradores');
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest('Datos inválidos');

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'La invitación de staff no está configurada' }, { status: 503 });
  }

  // Sin `redirectTo` explícito, Supabase usa el "Site URL" configurado en
  // el dashboard de Auth — si ese valor quedó en localhost (entorno de
  // desarrollo), la invitación manda al destinatario a una URL que no
  // puede abrir en su propia máquina. Acá se fuerza siempre al dominio
  // real de la app.
  const { error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { full_name: parsed.data.fullName, role: 'admin' },
    redirectTo: `${clientEnv.NEXT_PUBLIC_SITE_URL}/aceptar-invitacion`,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  await logAuditEvent(result.profile, 'invite', 'staff', null, parsed.data.fullName);

  return NextResponse.json({ email: parsed.data.email });
}
