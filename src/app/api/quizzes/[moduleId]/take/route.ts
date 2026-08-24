import { NextResponse } from 'next/server';

import { guard, isDenied } from '../../../_lib/guard';
import { demoQuizForStudent } from '../../_lib';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Preguntas del quiz SIN la respuesta correcta — el cliente admin salta RLS
 * a propósito (así se puede elegir a mano qué columnas exponer), pero acá
 * nunca se selecciona `is_correct` de `quiz_options`: ni siquiera es un dato
 * que este código tenga en la mano para filtrar mal por accidente.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const result = await guard('quiz:take');
  if (isDenied(result)) return result.response;

  const { moduleId } = await params;

  const admin = getSupabaseAdminClient();
  if (!admin) {
    const quiz = demoQuizForStudent(moduleId);
    if (!quiz) return NextResponse.json({ error: 'Esta unidad no tiene evaluación' }, { status: 404 });
    return NextResponse.json(quiz);
  }

  const { data: moduleRow } = await admin.from('modules').select('id, course_id').eq('id', moduleId).maybeSingle();
  if (!moduleRow) return NextResponse.json({ error: 'Unidad no encontrada' }, { status: 404 });

  const { data: enrollment } = await admin
    .from('enrollments')
    .select('id')
    .eq('course_id', moduleRow.course_id)
    .eq('student_id', result.profile.id)
    .maybeSingle();
  if (!enrollment) return NextResponse.json({ error: 'No estás matriculado en este curso' }, { status: 403 });

  const { data: quiz } = await admin
    .from('quizzes')
    .select('id, passing_score')
    .eq('module_id', moduleId)
    .maybeSingle();
  if (!quiz) return NextResponse.json({ error: 'Esta unidad no tiene evaluación' }, { status: 404 });

  const { data: questions } = await admin
    .from('quiz_questions')
    .select('id, prompt, position')
    .eq('quiz_id', quiz.id)
    .order('position');

  const questionIds = (questions ?? []).map((q) => q.id);
  const { data: options } = await admin
    .from('quiz_options')
    .select('id, question_id, label, position')
    .in('question_id', questionIds.length > 0 ? questionIds : ['00000000-0000-0000-0000-000000000000'])
    .order('position');

  return NextResponse.json({
    passingScore: quiz.passing_score,
    questions: (questions ?? []).map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: (options ?? [])
        .filter((option) => option.question_id === question.id)
        .map((option) => ({ id: option.id, label: option.label })),
    })),
  });
}
