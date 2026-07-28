import 'server-only';

import { DEMO_QUESTION } from '@/services/demo/data';
import type { PracticeQuestion } from '@/types';

/**
 * Banco de ejercicios. Hoy sirve el ejercicio de referencia del diseño; al
 * conectar Supabase basta con cambiar `getQuestionForStep` por una consulta:
 * el contrato con el cliente no cambia.
 */
const BANK: PracticeQuestion[] = [DEMO_QUESTION];

export function getQuestionForStep(step: number): PracticeQuestion {
  return BANK[(step - 1) % BANK.length] ?? DEMO_QUESTION;
}

export function getQuestionById(id: string): PracticeQuestion | undefined {
  return BANK.find((question) => question.id === id);
}

/** Versión pública: sin `correctOptionId` ni explicaciones. */
export function toPublicQuestion(question: PracticeQuestion): PracticeQuestion {
  const { correctOptionId: _omit, ...rest } = question;
  return { ...rest, explanationCorrect: '', explanationWrong: '' };
}
