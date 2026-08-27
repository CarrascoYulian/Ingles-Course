import { NextResponse } from 'next/server';

import { guard, isDenied } from '../_lib/guard';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const PAGE_SIZE = 30;

/**
 * Lista el log de auditoría, más reciente primero. Sin filtros en esta
 * primera versión — sólo paginación por offset (`?page=`).
 */
export async function GET(request: Request) {
  const result = await guard('audit:read');
  if (isDenied(result)) return result.response;

  const page = Math.max(1, Number(new URL(request.url).searchParams.get('page') ?? '1') || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ items: [], hasMore: false });

  const { data, error } = await supabase
    .from('audit_log')
    .select('id, actor_name, action, entity_type, entity_id, entity_label, created_at')
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json({ items: data, hasMore: data.length === PAGE_SIZE });
}
