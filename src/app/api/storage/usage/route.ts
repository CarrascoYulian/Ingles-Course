import { NextResponse } from 'next/server';

import { guard, isDenied } from '../../_lib/guard';
import { IS_DEMO_MODE } from '@/lib/env';
import {
  listAllStorageObjects,
  STORAGE_CRITICAL_THRESHOLD_PERCENT,
  STORAGE_PLAN_LIMIT_BYTES,
  STORAGE_WARNING_THRESHOLD_PERCENT,
} from '@/lib/storage';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { StorageUsage } from '@/types';

export const runtime = 'nodejs';

const DEMO_USED_BYTES = 0.3 * 1024 ** 3;
const DEMO_USAGE: StorageUsage = {
  usedBytes: DEMO_USED_BYTES,
  limitBytes: STORAGE_PLAN_LIMIT_BYTES,
  usedPercent: Math.round((DEMO_USED_BYTES / STORAGE_PLAN_LIMIT_BYTES) * 100),
  tier: 'ok',
  byCourse: [],
};

/** < 65 % azul, 65-89 % ámbar, 90 %+ rojo. */
function tierFor(usedPercent: number): StorageUsage['tier'] {
  if (usedPercent >= STORAGE_CRITICAL_THRESHOLD_PERCENT) return 'critical';
  if (usedPercent >= STORAGE_WARNING_THRESHOLD_PERCENT) return 'warning';
  return 'ok';
}

/**
 * Fase 3 (issue #39) — uso real del bucket `course-files` para el widget del
 * sidebar admin. Antes era un valor fijo en el diseño; ahora suma
 * `metadata.size` de cada objeto real del bucket.
 *
 * No hay contador agregado en Postgres (evitaría listar el bucket completo
 * en cada carga): el bucket de un curso de inglés no tiene volumen para que
 * eso importe todavía — si algún día lo tiene, el TODO está documentado en
 * `listAllStorageObjects`.
 */
export async function GET() {
  const result = await guard('report:read');
  if (isDenied(result)) return result.response;

  if (IS_DEMO_MODE) {
    return NextResponse.json(DEMO_USAGE, { headers: { 'Cache-Control': 'private, max-age=120' } });
  }

  const objects = await listAllStorageObjects();
  const usedBytes = objects.reduce((sum, object) => sum + object.size, 0);
  const usedPercent = Math.min(100, Math.round((usedBytes / STORAGE_PLAN_LIMIT_BYTES) * 100));
  const tier = tierFor(usedPercent);

  if (tier === 'critical') await notifyCritical(usedPercent);

  const byCourse = await breakdownByCourse(objects);

  const usage: StorageUsage = { usedBytes, limitBytes: STORAGE_PLAN_LIMIT_BYTES, usedPercent, tier, byCourse };
  return NextResponse.json(usage, { headers: { 'Cache-Control': 'private, max-age=120' } });
}

/**
 * Suma bytes por curso a partir del propio `key` del objeto — la ruta
 * jerárquica de `buildMediaKey` (`cursos/{courseId}/modulos/...`) ya trae
 * el curso sin tener que cruzar contra Postgres lección por lección. Los
 * nombres se resuelven en una sola consulta batched al final.
 */
async function breakdownByCourse(
  objects: Awaited<ReturnType<typeof listAllStorageObjects>>,
): Promise<StorageUsage['byCourse']> {
  const bytesByCourseId = new Map<string, number>();
  for (const object of objects) {
    const courseId = object.key.split('/')[1];
    if (!courseId) continue;
    bytesByCourseId.set(courseId, (bytesByCourseId.get(courseId) ?? 0) + object.size);
  }
  if (bytesByCourseId.size === 0) return [];

  const admin = getSupabaseAdminClient();
  const names = new Map<string, string>();
  if (admin) {
    const { data } = await admin.from('courses').select('id, name').in('id', [...bytesByCourseId.keys()]);
    for (const row of data ?? []) names.set(row.id, row.name);
  }

  return [...bytesByCourseId.entries()]
    .map(([courseId, bytes]) => ({
      courseId,
      // Un curso ya borrado puede seguir teniendo objetos huérfanos en R2
      // hasta que pase el cron de reconciliación — se muestran igual, con
      // una etiqueta que deja claro que no corresponden a un curso vivo.
      courseName: names.get(courseId) ?? 'Curso eliminado',
      bytes,
    }))
    .sort((a, b) => b.bytes - a.bytes);
}

/**
 * Deja una entrada visible en "Actividad reciente" del dashboard cuando se
 * cruza el umbral crítico (90 %) — es el "correo o log visible" más barato
 * que cumple el criterio de aceptación sin construir un sistema de
 * notificaciones nuevo. Deduplicado a una vez por día: sin esto, cada carga
 * de página por encima del umbral insertaría una fila nueva.
 */
async function notifyCritical(usedPercent: number): Promise<void> {
  const admin = getSupabaseAdminClient();
  if (!admin) return;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from('activity_log')
    .select('*', { count: 'exact', head: true })
    .eq('tone', 'danger')
    .contains('segments', [{ text: 'Alerta de almacenamiento', strong: true }])
    .gte('created_at', since);
  if ((count ?? 0) > 0) return;

  await admin.from('activity_log').insert({
    tone: 'danger',
    segments: [
      { text: 'Alerta de almacenamiento', strong: true },
      { text: ` · uso al ${usedPercent}% del plan contratado` },
    ],
  });
}
