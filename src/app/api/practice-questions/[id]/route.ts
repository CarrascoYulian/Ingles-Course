import { NextResponse } from 'next/server';

import { badRequest, guard, isDenied } from '../../_lib/guard';
import { practiceQuestionInputSchema } from '../_schema';
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
    options: row.options as unknown as PracticeQuestionAdmin['options'],
    correctOptionIds: row.correct_option_ids,
    explanationCorrect: row.explanation_correct,
    explanationWrong: row.explanation_wrong,
  };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await guard('practice:manage');
  if (isDenied(result)) return result.response;

  const { id } = await params;
  const parsed = practiceQuestionInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Datos inválidos');

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'No configurado' }, { status: 503 });

  const { data, error } = await supabase
    .from('practice_questions')
    .update({
      category: parsed.data.category,
      xp_reward: parsed.data.xpReward,
      prompt: parsed.data.prompt,
      source_text: parsed.data.sourceText,
      options: parsed.data.options,
      correct_option_ids: parsed.data.correctOptionIds,
      explanation_correct: parsed.data.explanationCorrect,
      explanation_wrong: parsed.data.explanationWrong,
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json(toAdminQuestion(data));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await guard('practice:manage');
  if (isDenied(result)) return result.response;

  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'No configurado' }, { status: 503 });

  const { error } = await supabase.from('practice_questions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json({ ok: true });
}
