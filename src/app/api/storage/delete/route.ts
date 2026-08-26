import { NextResponse } from 'next/server';
import { z } from 'zod';

import { badRequest, guard, isDenied } from '../../_lib/guard';
import { removeStorageObjects } from '@/lib/storage';

export const runtime = 'nodejs';

const requestSchema = z.object({ mediaKeys: z.array(z.string().min(1)).max(500) });

/**
 * Borra objetos reales de R2 al momento — antes el backend del navegador
 * llamaba a `db().storage.from('course-files').remove(keys)`, que es la API
 * de Supabase Storage sobre el bucket viejo (pre-migración a R2, ver
 * `0003_storage.sql`): no borraba nada real, sólo fallaba en silencio
 * (`console.error`) contra un bucket que ya no tiene estos objetos. El
 * archivo huérfano igual se limpiaba, pero recién con el cron semanal de
 * `/api/storage/reconcile` (hasta 48 h después) en vez de al instante.
 *
 * Esta ruta existe porque `storage.ts` es `server-only` — el backend de
 * Supabase corre en el navegador y no puede llamar a R2 directamente.
 */
export async function POST(request: Request) {
  const result = await guard(['content:delete', 'course:delete']);
  if (isDenied(result)) return result.response;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest('Lista de claves inválida');

  const { removed, error } = await removeStorageObjects(parsed.data.mediaKeys);
  if (error) return NextResponse.json({ removed, error }, { status: 500 });
  return NextResponse.json({ removed, error: null });
}
