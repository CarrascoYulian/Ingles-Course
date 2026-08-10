import { NextResponse } from 'next/server';

import { guard, isDenied } from '../../_lib/guard';
import { getQuestionForStep, toPublicQuestion } from '../_bank';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Entrega el ejercicio SIN la respuesta correcta.
 *
 * Es la mitad del contrato de seguridad de la práctica: el navegador no
 * puede saber la solución antes de contestar. La otra mitad está en
 * `POST /api/practice/answer`, que es quien corrige.
 *
 * Antes servía siempre el mismo ejercicio hardcodeado, sin importar el
 * nivel del alumno. Ahora resuelve el nivel CEFR real desde su
 * `practice_progress` para traer una pregunta acorde.
 */
export async function GET(request: Request) {
  const result = await guard('practice:play');
  if (isDenied(result)) return result.response;

  const step = Number(new URL(request.url).searchParams.get('step') ?? '1');

  const supabase = await getSupabaseServerClient();
  let level = 1;
  if (supabase) {
    const { data } = await supabase
      .from('practice_progress')
      .select('current_level')
      .eq('student_id', result.profile.id)
      .maybeSingle();
    level = data?.current_level ?? 1;
  }

  const question = await getQuestionForStep(supabase, level, Number.isFinite(step) ? step : 1);

  return NextResponse.json(toPublicQuestion(question), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
