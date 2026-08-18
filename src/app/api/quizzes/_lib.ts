import 'server-only';

import { getDemoQuizDraft, recordDemoQuizAttempt } from '@/services/demo/backend';
import type { QuizAttempt, QuizQuestionForStudent } from '@/types';

/**
 * IDs sintéticos y deterministas (`q0`, `q0-o1`, …) sólo para el fixture en
 * memoria — el modo real usa los UUID reales de Postgres. Da igual en modo
 * demo porque `DEMO_QUIZ_DRAFT` tiene un orden fijo; nunca se usan como
 * identidad real de nada.
 */
function questionId(index: number): string {
  return `q${index}`;
}
function optionId(questionIndex: number, optionIndex: number): string {
  return `q${questionIndex}-o${optionIndex}`;
}

export function demoQuizForStudent(
  moduleId: string,
): { passingScore: number; questions: QuizQuestionForStudent[] } | null {
  const draft = getDemoQuizDraft(moduleId);
  if (!draft) return null;
  return {
    passingScore: draft.passingScore,
    questions: draft.questions.map((question, qi) => ({
      id: questionId(qi),
      prompt: question.prompt,
      options: question.options.map((option, oi) => ({ id: optionId(qi, oi), label: option.label })),
    })),
  };
}

export function scoreAndRecordDemoAttempt(
  moduleId: string,
  answers: Record<string, string>,
): QuizAttempt | null {
  const draft = getDemoQuizDraft(moduleId);
  if (!draft || draft.questions.length === 0) return null;

  const correctCount = draft.questions.filter((question, qi) => {
    const correctIndex = question.options.findIndex((option) => option.isCorrect);
    return answers[questionId(qi)] === optionId(qi, correctIndex);
  }).length;

  const score = Math.round((correctCount / draft.questions.length) * 100);
  const passed = score >= draft.passingScore;
  return recordDemoQuizAttempt(`quiz-${moduleId}`, score, passed);
}
