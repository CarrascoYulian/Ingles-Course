import { NextResponse } from 'next/server';
import { z } from 'zod';

import { badRequest, guard, isDenied } from '../../_lib/guard';
import { getQuestionById } from '../_bank';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { AnswerResult } from '@/services';

export const runtime = 'nodejs';

const requestSchema = z.object({
  questionId: z.string().min(1),
  optionId: z.string().min(1),
});

/**
 * Corrige el ejercicio en el servidor y acredita la XP.
 *
 * Es aquí donde vive la verdad: el cliente sólo envía qué opción eligió. Un
 * navegador manipulado no puede regalarse puntos porque el incremento se
 * calcula con el ejercicio del banco, no con lo que llega en el cuerpo.
 *
 * Antes esta ruta calculaba `xpGained` pero nunca lo escribía en
 * `practice_progress` fuera del modo demo: la XP se mostraba en pantalla y
 * se perdía al recargar. Ahora hace el upsert real.
 */
export async function POST(request: Request) {
  const result = await guard('practice:play');
  if (isDenied(result)) return result.response;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest('Respuesta inválida');

  const question = getQuestionById(parsed.data.questionId);
  if (!question || !question.correctOptionId) {
    return NextResponse.json({ error: 'Ejercicio no encontrado' }, { status: 404 });
  }

  const correct = parsed.data.optionId === question.correctOptionId;
  const xpGained = correct ? question.xpReward : 0;

  const supabase = await getSupabaseServerClient();
  if (supabase && xpGained > 0) {
    const { data: current } = await supabase
      .from('practice_progress')
      .select('*')
      .eq('student_id', result.profile.id)
      .maybeSingle();

    await supabase.from('practice_progress').upsert({
      student_id: result.profile.id,
      xp: (current?.xp ?? 0) + xpGained,
      coins: current?.coins ?? 0,
      streak_days: current?.streak_days ?? 0,
      current_level: current?.current_level ?? 1,
      current_step: current?.current_step ?? 1,
      updated_at: new Date().toISOString(),
    });
  }

  const answer: AnswerResult = {
    correct,
    xpGained,
    explanation: correct ? question.explanationCorrect : question.explanationWrong,
    correctOptionId: question.correctOptionId,
  };

  return NextResponse.json(answer, { headers: { 'Cache-Control': 'no-store' } });
}
