import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { DEMO_QUESTION } from '@/services/demo/data';
import type { Database, PracticeOption, PracticeQuestion } from '@/types';

function toQuestion(row: Database['public']['Tables']['practice_questions']['Row']): PracticeQuestion {
  return {
    id: row.id,
    category: row.category,
    xpReward: row.xp_reward,
    prompt: row.prompt,
    sourceText: row.source_text,
    audioKey: null,
    options: row.options as unknown as PracticeOption[],
    correctOptionIds: row.correct_option_ids,
    explanationCorrect: row.explanation_correct,
    explanationWrong: row.explanation_wrong,
  };
}

/**
 * Antes esto era un único ejercicio hardcodeado, siempre el mismo sin
 * importar el nivel del alumno. Ahora resuelve la pregunta real que
 * corresponde al paso del alumno, ciclada dentro del banco único que el
 * profesor cargó — el juego nunca estuvo segmentado por nivel CEFR (eso
 * era sólo el rango 1-500 del mapa de niveles), así que todos los alumnos
 * comparten el mismo banco. El banco no tiene un tamaño fijo, así que el
 * ciclo se calcula sobre las preguntas que existan de verdad (ver
 * `/admin/practica`).
 */
export async function getQuestionForStep(
  supabase: SupabaseClient<Database> | null,
  step: number,
): Promise<PracticeQuestion> {
  if (!supabase) return DEMO_QUESTION;

  const { data: rows } = await supabase
    .from('practice_questions')
    .select('*')
    .order('position', { ascending: true });

  if (!rows || rows.length === 0) return DEMO_QUESTION;

  const index = (Math.max(1, step) - 1) % rows.length;
  return toQuestion(rows[index]!);
}

/** Versión pública: sin `correctOptionIds` ni explicaciones. */
export function toPublicQuestion(question: PracticeQuestion): PracticeQuestion {
  const { correctOptionIds: _omit, ...rest } = question;
  return { ...rest, explanationCorrect: '', explanationWrong: '' };
}
