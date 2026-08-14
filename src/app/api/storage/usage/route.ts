import { NextResponse } from 'next/server';

import { guard, isDenied } from '../../_lib/guard';
import { IS_DEMO_MODE } from '@/lib/env';
import {
  listAllStorageObjects,
  STORAGE_ALERT_THRESHOLD_PERCENT,
  STORAGE_PLAN_LIMIT_BYTES,
} from '@/lib/storage';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { StorageUsage } from '@/types';

export const runtime = 'nodejs';

const DEMO_USED_BYTES = 0.3 * 1024 ** 3;
const DEMO_USAGE: StorageUsage = {
  usedBytes: DEMO_USED_BYTES,
  limitBytes: STORAGE_PLAN_LIMIT_BYTES,
  usedPercent: Math.round((DEMO_USED_BYTES / STORAGE_PLAN_LIMIT_BYTES) * 100),
  nearLimit: false,
};

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
  const nearLimit = usedPercent >= STORAGE_ALERT_THRESHOLD_PERCENT;

  if (nearLimit) await notifyNearLimit(usedPercent);

  const usage: StorageUsage = { usedBytes, limitBytes: STORAGE_PLAN_LIMIT_BYTES, usedPercent, nearLimit };
  return NextResponse.json(usage, { headers: { 'Cache-Control': 'private, max-age=120' } });
}

/**
 * Deja una entrada visible en "Actividad reciente" del dashboard cuando se
 * cruza el umbral — es el "correo o log visible" más barato que cumple el
 * criterio de aceptación sin construir un sistema de notificaciones nuevo.
 * Deduplicado a una vez por día: sin esto, cada carga de página por encima
 * del umbral insertaría una fila nueva.
 */
async function notifyNearLimit(usedPercent: number): Promise<void> {
  const admin = getSupabaseAdminClient();
  if (!admin) return;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from('activity_log')
    .select('*', { count: 'exact', head: true })
    .eq('tone', 'warning')
    .contains('segments', [{ text: 'Alerta de almacenamiento', strong: true }])
    .gte('created_at', since);
  if ((count ?? 0) > 0) return;

  await admin.from('activity_log').insert({
    tone: 'warning',
    segments: [
      { text: 'Alerta de almacenamiento', strong: true },
      { text: ` · uso al ${usedPercent}% del plan contratado` },
    ],
  });
}
