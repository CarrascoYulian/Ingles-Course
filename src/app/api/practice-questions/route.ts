import { NextResponse } from 'next/server';

import { badRequest, guard, isDenied } from '../_lib/guard';
import { practiceQuestionInputSchema } from './_schema';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Database, PracticeQuestionAdmin } from '@/types';

export const runtime = 'nodejs';

function toAdminQuestion(row: Database['public']['Tables']['practice_questions']['Row']): PracticeQuestionAdmin {
  return {
    id: row.id,
    position: row.position,
    category: row.category,
    xpReward: row.xp_reward,
    prompt: row.prompt,
    sourceText: row.source_text,
    audioKey: null,
    voice: row.voice === 'male' ? 'male' : 'female',
    options: row.options as unknown as PracticeQuestionAdmin['options'],
    answerCount: row.correct_option_ids?.length ?? 1,
    correctOptionIds: row.correct_option_ids,
    explanationCorrect: row.explanation_correct,
    explanationWrong: row.explanation_wrong,
  };
}

/** Banco completo de preguntas, ordenado como lo verá el alumno. */
export async function GET() {
  const result = await guard('practice:manage');
  if (isDenied(result)) return result.response;

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ questions: [] });

  const { data, error } = await supabase
    .from('practice_questions')
    .select('*')
    .order('position', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json({ questions: (data ?? []).map(toAdminQuestion) });
}

/**
 * Crea una pregunta al final del banco — la posición no la elige el
 * profesor, se calcula (máxima existente + 1) para que la unicidad de
 * `position` nunca choque.
 */
export async function POST(request: Request) {
  const result = await guard('practice:manage');
  if (isDenied(result)) return result.response;

  const parsed = practiceQuestionInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Datos inválidos');

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'No configurado' }, { status: 503 });

  const { data: last } = await supabase
    .from('practice_questions')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from('practice_questions')
    .insert({
      position: (last?.position ?? 0) + 1,
      category: parsed.data.category,
      xp_reward: parsed.data.xpReward,
      prompt: parsed.data.prompt,
      source_text: parsed.data.sourceText,
      voice: parsed.data.voice,
      options: parsed.data.options,
      correct_option_ids: parsed.data.correctOptionIds,
      explanation_correct: parsed.data.explanationCorrect,
      explanation_wrong: parsed.data.explanationWrong,
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json(toAdminQuestion(data));
}
