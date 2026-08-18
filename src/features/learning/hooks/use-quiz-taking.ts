'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { QuizAttempt, QuizQuestionForStudent } from '@/types';

export interface QuizForStudent {
  passingScore: number;
  questions: QuizQuestionForStudent[];
}

/**
 * A diferencia del resto de `learning`, esto NO pasa por `backend` (los dos
 * adaptadores de `ports.ts`) — va directo a `/api/quizzes/[moduleId]/take`,
 * que arma la versión sin `isCorrect` en el servidor. Meter esto en el
 * puerto normal habría significado que el adaptador Supabase leyera
 * `quiz_options` directo con la anon key, y esa tabla no tiene política de
 * select para alumnos a propósito (ver `0032_module_quizzes.sql`).
 */
export function useQuizToTake(moduleId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['quiz-to-take', moduleId],
    queryFn: async (): Promise<QuizForStudent> => {
      const response = await fetch(`/api/quizzes/${moduleId}/take`);
      if (!response.ok) throw new Error('No se pudo cargar la evaluación');
      return response.json();
    },
    enabled: enabled && moduleId !== '',
  });
}

export function useSubmitQuizAttempt(moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (answers: Record<string, string>): Promise<QuizAttempt> => {
      const response = await fetch(`/api/quizzes/${moduleId}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      if (!response.ok) throw new Error('No se pudo enviar la evaluación');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-quiz-attempts'] });
    },
  });
}
