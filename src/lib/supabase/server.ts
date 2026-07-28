import 'server-only';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { clientEnv, getServerEnv, IS_DEMO_MODE } from '@/lib/env';
import type { Database } from '@/types';

type ServerClient = ReturnType<typeof createServerClient<Database>>;

/**
 * Cliente para Server Components, Route Handlers y Server Actions.
 * Se crea por petición: nunca debe cachearse entre peticiones.
 */
export async function getSupabaseServerClient(): Promise<ServerClient | null> {
  if (IS_DEMO_MODE) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL!,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Los Server Components no pueden escribir cookies. El refresco de
            // sesión lo hace el middleware, así que ignorar aquí es correcto.
          }
        },
      },
    },
  );
}

/**
 * Cliente con service role: SALTA RLS. Usar sólo en tareas administrativas
 * verificadas en servidor (invitaciones, backfills). Nunca en el cliente.
 */
export function getSupabaseAdminClient(): ServerClient | null {
  if (IS_DEMO_MODE) return null;
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();
  if (!SUPABASE_SERVICE_ROLE_KEY) return null;

  return createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_SERVICE_ROLE_KEY,
    { cookies: { getAll: () => [], setAll: () => undefined } },
  );
}
