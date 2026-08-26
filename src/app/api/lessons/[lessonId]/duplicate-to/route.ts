import { NextResponse } from 'next/server';
import { z } from 'zod';

import { badRequest, guard, isDenied } from '../../../_lib/guard';
import { duplicateMediaObject } from '@/lib/storage';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const requestSchema = z.object({ targetModuleId: z.string().min(1) });

/**
 * "Reutilizar de la biblioteca": clona un archivo ya subido como bloque
 * nuevo en otra unidad — copia real del binario en R2 (mismo motivo que
 * `/api/modules/[moduleId]/duplicate`: dos lecciones nunca comparten
 * `media_key`, o borrar una se llevaría puesto el archivo de la otra).
 */
export async function POST(request: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const result = await guard('content:edit');
  if (isDenied(result)) return result.response;

  const { lessonId } = await params;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest('Unidad de destino inválida');
  const { targetModuleId } = parsed.data;

  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'No disponible en modo demo' }, { status: 503 });

  const { data: source } = await admin.from('lessons').select('*').eq('id', lessonId).maybeSingle();
  if (!source) return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
  if (!source.media_key) return NextResponse.json({ error: 'Ese bloque no tiene archivo' }, { status: 400 });

  const newMediaKey = await duplicateMediaObject(source.media_key, targetModuleId);
  if (!newMediaKey) {
    return NextResponse.json({ error: 'No se pudo copiar el archivo' }, { status: 500 });
  }

  // MAX(position) + 1, no count(*): un hueco de un bloque ya borrado hace
  // que count() reintente una posición ya ocupada y choque contra la
  // restricción única (module_id, position) — ver `nextBlockPosition` en
  // services/supabase/backend.ts.
  const { data: lastLesson } = await admin
    .from('lessons')
    .select('position')
    .eq('module_id', targetModuleId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: newLesson, error } = await admin
    .from('lessons')
    .insert({
      module_id: targetModuleId,
      type: source.type,
      title: source.title,
      meta: source.meta,
      position: (lastLesson?.position ?? -1) + 1,
      media_key: newMediaKey,
      duration_minutes: source.duration_minutes,
      duration_seconds: source.duration_seconds,
      uploaded_by: result.profile.id,
    })
    .select()
    .single();
  if (error || !newLesson) {
    return NextResponse.json({ error: error?.message ?? 'No se pudo crear el bloque' }, { status: 500 });
  }

  return NextResponse.json({ id: newLesson.id });
}
