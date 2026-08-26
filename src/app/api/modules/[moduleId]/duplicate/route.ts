import { NextResponse } from 'next/server';

import { guard, isDenied } from '../../../_lib/guard';
import { duplicateMediaObject } from '@/lib/storage';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
// Copiar varios binarios grandes en R2 (CopyObjectCommand corre server-side,
// no transfiere bytes por esta función, pero sí espera la confirmación de
// cada copia) puede superar el límite por defecto en una unidad con muchos
// videos.
export const maxDuration = 120;

/**
 * Duplica una unidad completa: la fila del módulo, sus lecciones (con copia
 * real del binario en R2 — no un segundo `media_key` apuntando al mismo
 * objeto, que se rompería en cuanto se borrara la unidad original) y su
 * evaluación con preguntas y opciones. No duplica tareas (`assignments`):
 * llevan fecha límite propia, copiarlas produciría entregas fantasma con un
 * vencimiento que no tiene sentido para la unidad nueva.
 *
 * Pensado para armar un curso repetitivo (misma estructura semana a semana)
 * más rápido que recreando cada unidad a mano.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const result = await guard('content:edit');
  if (isDenied(result)) return result.response;

  const { moduleId } = await params;

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'No disponible en modo demo' }, { status: 503 });
  }

  const { data: sourceModule } = await admin
    .from('modules')
    .select('*')
    .eq('id', moduleId)
    .maybeSingle();
  if (!sourceModule) return NextResponse.json({ error: 'Unidad no encontrada' }, { status: 404 });

  const { count } = await admin
    .from('modules')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', sourceModule.course_id);

  const { data: newModule, error: moduleError } = await admin
    .from('modules')
    .insert({
      course_id: sourceModule.course_id,
      title: `${sourceModule.title} (copia)`,
      position: count ?? 0,
      // Nunca se copia el prerrequisito: apuntaría a la unidad original, no
      // a la copia, y el docente puede volver a asignarlo si corresponde.
      requires_module_id: null,
    })
    .select()
    .single();
  if (moduleError || !newModule) {
    return NextResponse.json({ error: moduleError?.message ?? 'No se pudo crear la unidad' }, { status: 500 });
  }

  const { data: lessons } = await admin
    .from('lessons')
    .select('*')
    .eq('module_id', moduleId)
    .order('position', { ascending: true });

  for (const lesson of lessons ?? []) {
    const newMediaKey = lesson.media_key
      ? await duplicateMediaObject(lesson.media_key, newModule.id)
      : null;

    await admin.from('lessons').insert({
      module_id: newModule.id,
      type: lesson.type,
      title: lesson.title,
      meta: lesson.meta,
      description: lesson.description,
      duration_minutes: lesson.duration_minutes,
      duration_seconds: lesson.duration_seconds,
      position: lesson.position,
      media_key: newMediaKey,
      uploaded_by: result.profile.id,
    });
  }

  const { data: sourceQuiz } = await admin
    .from('quizzes')
    .select('*')
    .eq('module_id', moduleId)
    .maybeSingle();

  if (sourceQuiz) {
    const { data: newQuiz } = await admin
      .from('quizzes')
      .insert({ module_id: newModule.id, passing_score: sourceQuiz.passing_score })
      .select()
      .single();

    if (newQuiz) {
      const { data: questions } = await admin
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', sourceQuiz.id)
        .order('position', { ascending: true });

      for (const question of questions ?? []) {
        const { data: newQuestion } = await admin
          .from('quiz_questions')
          .insert({ quiz_id: newQuiz.id, prompt: question.prompt, position: question.position })
          .select()
          .single();
        if (!newQuestion) continue;

        const { data: options } = await admin
          .from('quiz_options')
          .select('*')
          .eq('question_id', question.id)
          .order('position', { ascending: true });

        if (options && options.length > 0) {
          await admin.from('quiz_options').insert(
            options.map((option) => ({
              question_id: newQuestion.id,
              label: option.label,
              is_correct: option.is_correct,
              position: option.position,
            })),
          );
        }
      }
    }
  }

  return NextResponse.json({ id: newModule.id });
}
