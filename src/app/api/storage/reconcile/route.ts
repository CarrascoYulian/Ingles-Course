import { NextResponse } from 'next/server';

import { getServerEnv } from '@/lib/env';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { listAllStorageObjects, removeStorageObjects } from '@/lib/storage';

export const runtime = 'nodejs';
// Recorrer el bucket entero y comparar contra Postgres puede tardar más que
// el límite por defecto de una función serverless en un bucket grande.
export const maxDuration = 300;

/** Margen de seguridad: nunca se toca un objeto más nuevo que esto, aunque no esté referenciado. */
const ORPHAN_MIN_AGE_MS = 48 * 60 * 60 * 1000;

/**
 * Fase 2 (issue #38) — job de reconciliación semanal.
 *
 * Compara el bucket `course-files` contra los `media_key` que Postgres dice
 * que existen y borra sólo los objetos que:
 *   1. no están referenciados por ningún content_block/lesson/resource vivo, y
 *   2. tienen más de 48 h desde su creación (margen para no borrar algo que
 *      se está subiendo en ese instante).
 *
 * Se invoca vía Vercel Cron (ver `vercel.json`), que firma la petición con
 * `CRON_SECRET` — sin ese secreto configurado, la ruta rechaza cualquier
 * llamada en vez de aceptarla sin autenticar.
 */
export async function GET(request: Request) {
  const { CRON_SECRET } = getServerEnv();
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Supabase no está configurado' }, { status: 503 });
  }

  const [objects, referenced] = await Promise.all([listAllStorageObjects(), collectReferencedKeys(admin)]);

  const cutoff = Date.now() - ORPHAN_MIN_AGE_MS;
  const orphans = objects.filter(
    (object) => !referenced.has(object.key) && new Date(object.createdAt).getTime() < cutoff,
  );

  const { removed, error } = await removeStorageObjects(orphans.map((o) => o.key));

  await admin.from('storage_reconcile_runs').insert({
    scanned_count: objects.length,
    deleted_count: removed.length,
    deleted_keys: removed,
    error,
  });

  if (error) {
    return NextResponse.json({ scanned: objects.length, deleted: 0, error }, { status: 500 });
  }
  return NextResponse.json({ scanned: objects.length, deleted: removed.length, deletedKeys: removed });
}

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

/**
 * Une los `media_key` de las tres tablas que pueden apuntar al mismo objeto
 * (`content_blocks`, `lessons`, `course_resources`) — normalmente
 * duplicados entre sí, pero unir las tres es más seguro que confiar en que
 * esa duplicación nunca se rompa.
 */
async function collectReferencedKeys(admin: AdminClient): Promise<Set<string>> {
  const [blocks, lessons, resources] = await Promise.all([
    admin.from('content_blocks').select('media_key').not('media_key', 'is', null),
    admin.from('lessons').select('media_key').not('media_key', 'is', null),
    admin.from('course_resources').select('media_key').not('media_key', 'is', null),
  ]);

  const keys = new Set<string>();
  for (const row of blocks.data ?? []) if (row.media_key) keys.add(row.media_key);
  for (const row of lessons.data ?? []) if (row.media_key) keys.add(row.media_key);
  for (const row of resources.data ?? []) if (row.media_key) keys.add(row.media_key);
  return keys;
}
