import { NextResponse } from 'next/server';
import { z } from 'zod';

import { badRequest, guard, isDenied } from '../../_lib/guard';
import { getQuestionForStep } from '../_bank';
import { HEARTS_TOTAL } from '../_constants';
import { recordDailyXpAndStreak } from '../_missions';
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

  const supabase = await getSupabaseServerClient();
  const current = supabase
    ? (
        await supabase
          .from('practice_progress')
          .select('*')
          .eq('student_id', result.profile.id)
          .maybeSingle()
      ).data
    : null;

  // El ejercicio a corregir siempre es el que corresponde al nivel/paso
  // guardado en el servidor para este alumno, nunca el que llega en el
  // cuerpo de la petición — antes se aceptaba cualquier id de pregunta que
  // existiera en el banco, permitiendo reenviar el id de un paso ya
  // completado (o uno futuro) para acumular XP indebidamente.
  const question = await getQuestionForStep(
    supabase,
    current?.current_level ?? 1,
    current?.current_step ?? 1,
  );
  if (parsed.data.questionId !== question.id || !question.correctOptionId) {
    return NextResponse.json(
      { error: 'Esta pregunta ya no corresponde a tu paso actual' },
      { status: 409 },
    );
  }

  const correct = parsed.data.optionId === question.correctOptionId;
  const xpGained = correct ? question.xpReward : 0;

  if (supabase) {
    // Antes los corazones eran un valor decorativo fijo que la API siempre
    // devolvía igual — ahora una respuesta incorrecta resta uno de verdad
    // (nunca por debajo de 0); una correcta no los toca.
    const heartsRemaining = correct
      ? (current?.hearts_remaining ?? HEARTS_TOTAL)
      : Math.max(0, (current?.hearts_remaining ?? HEARTS_TOTAL) - 1);

    // Antes `streak_days` nunca se recalculaba en ningún endpoint, sólo se
    // leía — la racha mostrada era la misma desde que se creó la fila.
    const streakDays = await recordDailyXpAndStreak(
      supabase,
      result.profile.id,
      xpGained,
      current?.streak_days ?? 0,
    );

    await supabase.from('practice_progress').upsert({
      student_id: result.profile.id,
      xp: (current?.xp ?? 0) + xpGained,
      coins: current?.coins ?? 0,
      streak_days: streakDays,
      current_level: current?.current_level ?? 1,
      current_step: current?.current_step ?? 1,
      hearts_remaining: heartsRemaining,
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
