import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { DEMO_QUESTION } from '@/services/demo/data';
import type { CefrLevel, Database, PracticeOption, PracticeQuestion } from '@/types';

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
    correctOptionIds: row.correct_option_ids,
    explanationCorrect: row.explanation_correct,
    explanationWrong: row.explanation_wrong,
  };
}

/**
 * Antes esto era un único ejercicio hardcodeado, siempre el mismo sin
 * importar el nivel del alumno. Ahora resuelve la pregunta real que
 * corresponde al nivel CEFR y al paso del alumno, cicladas dentro del
 * banco que el profesor cargó para ese nivel — el banco ya no tiene un
 * tamaño fijo, así que el ciclo se calcula sobre las preguntas que existan
 * de verdad (ver `/admin/practica`).
 */
export async function getQuestionForStep(
  supabase: SupabaseClient<Database> | null,
  level: number,
  step: number,
): Promise<PracticeQuestion> {
  if (!supabase) return DEMO_QUESTION;

  const tier = tierForLevel(level);

  const { data: rows } = await supabase
    .from('practice_questions')
    .select('*')
    .eq('cefr_tier', tier)
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
