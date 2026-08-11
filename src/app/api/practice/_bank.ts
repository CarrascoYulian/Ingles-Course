import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { DEMO_QUESTION } from '@/services/demo/data';
import type { CefrLevel, Database, PracticeOption, PracticeQuestion } from '@/types';

/** Preguntas reales por nivel CEFR — ver migración 0018_practice_questions.sql. */
const QUESTIONS_PER_TIER = 16;

/**
 * Convierte el nivel numérico del juego (1-500) al nivel CEFR real de las
 * preguntas — el mismo reparto usado al generar `practice_levels`
 * (migración 0017): 1-100 → A1, 101-200 → A2, 201-300 → B1, 301-400 → B2,
 * 401-500 → C1.
 */
export function tierForLevel(level: number): CefrLevel {
  if (level <= 100) return 'A1';
  if (level <= 200) return 'A2';
  if (level <= 300) return 'B1';
  if (level <= 400) return 'B2';
  return 'C1';
}

function toQuestion(row: Database['public']['Tables']['practice_questions']['Row']): PracticeQuestion {
  return {
    id: row.id,
    category: row.category,
    xpReward: row.xp_reward,
    prompt: row.prompt,
    sourceText: row.source_text,
    audioKey: null,
    options: row.options as unknown as PracticeOption[],
    correctOptionId: row.correct_option_id,
    explanationCorrect: row.explanation_correct,
    explanationWrong: row.explanation_wrong,
  };
}

/**
 * Antes esto era un único ejercicio hardcodeado, siempre el mismo sin
 * importar el nivel del alumno. Ahora resuelve la pregunta real que
 * corresponde al nivel CEFR y al paso del alumno, cicladas dentro del
 * banco de 16 preguntas de ese nivel.
 */
export async function getQuestionForStep(
  supabase: SupabaseClient<Database> | null,
  level: number,
  step: number,
): Promise<PracticeQuestion> {
  if (!supabase) return DEMO_QUESTION;

  const tier = tierForLevel(level);
  const position = ((Math.max(1, step) - 1) % QUESTIONS_PER_TIER) + 1;

  const { data } = await supabase
    .from('practice_questions')
    .select('*')
    .eq('cefr_tier', tier)
    .eq('position', position)
    .maybeSingle();

  return data ? toQuestion(data) : DEMO_QUESTION;
}

/** Versión pública: sin `correctOptionId` ni explicaciones. */
export function toPublicQuestion(question: PracticeQuestion): PracticeQuestion {
  const { correctOptionId: _omit, ...rest } = question;
  return { ...rest, explanationCorrect: '', explanationWrong: '' };
}
