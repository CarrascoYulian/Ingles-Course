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
 * Antes servía siempre el mismo ejercicio hardcodeado. Ahora resuelve la
 * pregunta real que corresponde al paso del alumno dentro del banco único
 * que carga el profesor.
 */
export async function GET(request: Request) {
  const result = await guard('practice:play');
  if (isDenied(result)) return result.response;

  const step = Number(new URL(request.url).searchParams.get('step') ?? '1');

  const supabase = await getSupabaseServerClient();
  const question = await getQuestionForStep(supabase, Number.isFinite(step) ? step : 1);

  return NextResponse.json(toPublicQuestion(question), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
