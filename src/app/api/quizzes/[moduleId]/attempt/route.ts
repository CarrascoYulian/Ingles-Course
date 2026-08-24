import { NextResponse } from 'next/server';
import { z } from 'zod';

import { badRequest, guard, isDenied } from '../../../_lib/guard';
import { scoreAndRecordDemoAttempt } from '../../_lib';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const requestSchema = z.object({
  // { [questionId]: optionId } — un objeto y no un array porque el orden en
  // que el alumno respondió no importa para calificar.
  answers: z.record(z.string(), z.string()),
});

/**
 * Califica en el servidor contra la respuesta correcta REAL — la única
 * forma legítima de crear un `quiz_attempts`. La migración
 * `0032_module_quizzes.sql` deja explícitamente sin política de insert a
 * los alumnos: si se pudiera insertar por RLS con la anon key, cualquiera
 * podría mandar `{ passed: true }` a mano y saltarse el quiz entero. Este
 * endpoint escribe con el cliente admin (sin RLS) después de validar server-
 * side que las respuestas son correctas.
 */
export async function POST(request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const result = await guard('quiz:take');
  if (isDenied(result)) return result.response;

  const { moduleId } = await params;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest('Respuestas inválidas');

  const admin = getSupabaseAdminClient();
  if (!admin) {
    const attempt = scoreAndRecordDemoAttempt(moduleId, parsed.data.answers);
    if (!attempt) return NextResponse.json({ error: 'Esta unidad no tiene evaluación' }, { status: 404 });
    return NextResponse.json(attempt);
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
    .select('id')
    .eq('quiz_id', quiz.id);
  if (!questions || questions.length === 0) {
    return NextResponse.json({ error: 'Este quiz todavía no tiene preguntas' }, { status: 409 });
  }

  const { data: options } = await admin
    .from('quiz_options')
    .select('id, question_id, is_correct')
    .in('question_id', questions.map((q) => q.id));

  const correctCount = questions.filter((question) => {
    const answeredOptionId = parsed.data.answers[question.id];
    const correctOption = (options ?? []).find((o) => o.question_id === question.id && o.is_correct);
    return Boolean(answeredOptionId) && answeredOptionId === correctOption?.id;
  }).length;

  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score >= quiz.passing_score;

  const { data: attempt, error } = await admin
    .from('quiz_attempts')
    .insert({ quiz_id: quiz.id, student_id: result.profile.id, score, passed })
    .select('id, score, passed, created_at')
    .single();
  if (error || !attempt) {
    return NextResponse.json({ error: error?.message ?? 'No se pudo guardar el intento' }, { status: 500 });
  }

  return NextResponse.json({
    id: attempt.id,
    score: attempt.score,
    passed: attempt.passed,
    createdAt: attempt.created_at,
  });
}
