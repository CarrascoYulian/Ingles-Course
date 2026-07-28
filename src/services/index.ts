import { IS_DEMO_MODE } from '@/lib/env';
import { demoBackend } from './demo/backend';
import { supabaseBackend } from './supabase/backend';
import type { Backend } from './ports';

/**
 * Punto de entrada único a los datos.
 *
 * Se elige el adaptador una sola vez, según haya o no credenciales de
 * Supabase. Ningún componente decide esto: para ellos sólo existe `Backend`.
 */
export const backend: Backend = IS_DEMO_MODE ? demoBackend : supabaseBackend;

export type * from './ports';
