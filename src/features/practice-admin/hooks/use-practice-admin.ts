'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { QUERY_KEYS } from '@/constants';
import { backend } from '@/services';
import type { PracticeQuestionInput } from '@/types';

export function usePracticeQuestions() {
  return useQuery({
    queryKey: QUERY_KEYS.practiceQuestions,
    queryFn: () => backend.practice.adminListQuestions(),
  });
}

export function useCreatePracticeQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PracticeQuestionInput) => backend.practice.adminCreateQuestion(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.practiceQuestions });
      toast('Pregunta agregada');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo crear la pregunta.'),
  });
}

export function useUpdatePracticeQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PracticeQuestionInput }) =>
      backend.practice.adminUpdateQuestion(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.practiceQuestions });
      toast('Pregunta actualizada');
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la pregunta.'),
  });
}

export function useDeletePracticeQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) => backend.practice.adminDeleteQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.practiceQuestions });
      toast('Pregunta eliminada');
    },
    onError: () => toast.error('No se pudo eliminar la pregunta.'),
  });
}
