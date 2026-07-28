import { NextResponse } from 'next/server';

import { guard, isDenied } from '../../_lib/guard';
import { IS_DEMO_MODE } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { DEMO_ACTIVITY } from '@/services/demo/data';
import type { ActivityEvent } from '@/types';

export const runtime = 'nodejs';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'justo ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

/**
 * Antes devolvía siempre `DEMO_ACTIVITY`. Ahora lee `activity_log`, una
 * tabla real que se rellena desde el backend cada vez que ocurre una acción
 * (reiniciar progreso, publicar/ocultar un curso, eliminarlo — ver
 * `services/supabase/backend.ts`). Si aún no ha pasado nada, la lista sale
 * vacía: eso es correcto, no un error.
 */
export async function GET() {
  const result = await guard('report:read');
  if (isDenied(result)) return result.response;

  if (IS_DEMO_MODE) {
    return NextResponse.json(DEMO_ACTIVITY, { headers: { 'Cache-Control': 'no-store' } });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase no disponible' }, { status: 503 });

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const events: ActivityEvent[] = (data ?? []).map((row) => ({
    id: row.id,
    tone: row.tone,
    segments: row.segments as ActivityEvent['segments'],
    timeAgo: timeAgo(row.created_at),
  }));

  return NextResponse.json(events, { headers: { 'Cache-Control': 'no-store' } });
}
