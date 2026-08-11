import { NextResponse } from 'next/server';

import { IS_DEMO_MODE } from '@/lib/env';
import { listDemoAccounts } from '@/lib/auth/demo-session';

export const runtime = 'nodejs';

/**
 * Cuentas de prueba del modo demo, para el panel de "usar cuenta" en
 * `/login`. Antes esas credenciales estaban escritas directamente en el
 * componente de login — visibles para cualquiera con acceso al código
 * fuente. Ahora sólo existen en `.env.local` (no versionado) y llegan al
 * navegador a través de esta ruta, sólo cuando el modo demo está activo.
 */
export async function GET() {
  if (!IS_DEMO_MODE) {
    return NextResponse.json({ error: 'Modo demo no disponible' }, { status: 404 });
  }

  const accounts = listDemoAccounts().map(({ email, password, role }) => ({
    email,
    password,
    role,
    label: role === 'admin' ? 'Administrador' : 'Estudiante',
  }));

  return NextResponse.json({ accounts });
}
