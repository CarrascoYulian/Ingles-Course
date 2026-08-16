'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { backend } from '@/services';
import type { QuizDraft } from '@/types';

export function useQuizDraft(moduleId: string) {
  return useQuery({
    queryKey: ['quiz-draft', moduleId],
    queryFn: () => backend.quiz.getQuizDraft(moduleId),
    enabled: moduleId !== '',
  });
}

export function useSaveQuizDraft(moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draft: QuizDraft) => backend.quiz.saveQuizDraft(moduleId, draft),
    onSuccess: () => {
      toast.success('Evaluación guardada');
      queryClient.invalidateQueries({ queryKey: ['quiz-draft', moduleId] });
    },
    onError: () => toast.error('No se pudo guardar la evaluación'),
  });
}

export function useRemoveQuiz(moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => backend.quiz.removeQuiz(moduleId),
    onSuccess: () => {
      toast.success('Evaluación eliminada');
      queryClient.invalidateQueries({ queryKey: ['quiz-draft', moduleId] });
    },
    onError: () => toast.error('No se pudo eliminar la evaluación'),
  });
}
