'use client';

import { createBrowserClient } from '@supabase/ssr';

import { clientEnv, IS_DEMO_MODE } from '@/lib/env';
import type { Database } from '@/types';

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>;

let cached: BrowserClient | null = null;

/**
 * Cliente de navegador (singleton). Devuelve `null` en modo demo para que
 * quien lo consuma tenga que decidir explícitamente qué hacer sin backend.
 */
export function getSupabaseBrowserClient(): BrowserClient | null {
  if (IS_DEMO_MODE) return null;
  cached ??= createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL!,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return cached;
}
