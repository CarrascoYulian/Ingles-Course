'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { QUERY_KEYS } from '@/constants';
import { backend } from '@/services';
import type { CefrLevel, PracticeQuestionInput } from '@/types';

export function usePracticeQuestions(tier: CefrLevel) {
  return useQuery({
    queryKey: QUERY_KEYS.practiceQuestions(tier),
    queryFn: () => backend.practice.adminListQuestions(tier),
  });
}

export function useCreatePracticeQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PracticeQuestionInput) => backend.practice.adminCreateQuestion(input),
    onSuccess: (question) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.practiceQuestions(question.cefrTier) });
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
    onSuccess: (question) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.practiceQuestions(question.cefrTier) });
      toast('Pregunta actualizada');
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la pregunta.'),
  });
}

export function useDeletePracticeQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; tier: CefrLevel }) => backend.practice.adminDeleteQuestion(id),
    onSuccess: (_data, { tier }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.practiceQuestions(tier) });
      toast('Pregunta eliminada');
    },
    onError: () => toast.error('No se pudo eliminar la pregunta.'),
  });
}
