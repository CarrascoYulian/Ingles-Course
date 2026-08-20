import 'server-only';

import { NextResponse } from 'next/server';

import { can, type Permission } from '@/lib/auth/rbac';
import { getCurrentProfile } from '@/lib/auth/session';
import type { Profile } from '@/types';

export type GuardResult = { profile: Profile } | { response: NextResponse };

/**
 * Puerta común de los Route Handlers. Devuelve el perfil o la respuesta de
 * error ya formada, para que cada ruta sea un `if` y no repita el bloque de
 * autenticación y permisos.
 *
 * Acepta un permiso único o una lista — una ruta compartida por dos roles
 * distintos con propósitos distintos (ej. `/api/uploads`: docente sube
 * contenido, alumno sube su entrega de tarea) pasa la lista en vez de
 * duplicar la ruta o el guard.
 */
export async function guard(permission: Permission | Permission[]): Promise<GuardResult> {
  const profile = await getCurrentProfile();

  if (!profile) {
    return {
      response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }),
    };
  }

  const permissions = Array.isArray(permission) ? permission : [permission];
  if (!permissions.some((p) => can(profile.role, p))) {
    return {
      response: NextResponse.json({ error: 'Sin permisos para esta acción' }, { status: 403 }),
    };
  }

  return { profile };
}

export function isDenied(result: GuardResult): result is { response: NextResponse } {
  return 'response' in result;
}

/** Respuesta 400 con los errores de Zod ya legibles. */
export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
