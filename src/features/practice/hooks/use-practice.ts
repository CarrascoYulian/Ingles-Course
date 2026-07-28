'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { QUERY_KEYS } from '@/constants';
import { backend } from '@/services';
import type { AnswerResult } from '@/services';

export function usePracticeSession() {
  return useQuery({
    queryKey: [...QUERY_KEYS.practice, 'session'],
    queryFn: () => backend.practice.getSession(),
  });
}

export function usePracticeLevels() {
  return useQuery({
    queryKey: [...QUERY_KEYS.practice, 'levels'],
    queryFn: () => backend.practice.listLevels(),
  });
}

export function usePracticeQuestion(step: number) {
  return useQuery({
    queryKey: [...QUERY_KEYS.practice, 'question', step],
    queryFn: () => backend.practice.getQuestion(step),
  });
}

/**
 * Máquina de estados del ejercicio: seleccionar → comprobar → continuar.
 *
 * La corrección vive en el servidor (`submitAnswer`), no en el cliente: la
 * respuesta correcta nunca llega al navegador antes de contestar.
 */
export function usePracticeRunner(questionId: string | undefined) {
  const queryClient = useQueryClient();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);

  const check = useMutation({
    mutationFn: () => {
      if (!questionId || !selectedOptionId) throw new Error('Sin selección');
      return backend.practice.submitAnswer(questionId, selectedOptionId);
    },
    onSuccess: (answer) => {
      setResult(answer);
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.practice, 'session'] });
      if (answer.correct) toast(`+${answer.xpGained} XP · racha intacta`);
    },
  });

  const advance = useMutation({
    mutationFn: () => backend.practice.advance(),
    onSuccess: () => {
      setSelectedOptionId(null);
      setResult(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.practice });
    },
  });

  const select = useCallback(
    (optionId: string) => {
      if (result) return; // Ya corregido: la selección queda congelada.
      setSelectedOptionId(optionId);
    },
    [result],
  );

  const submit = useCallback(() => {
    if (!selectedOptionId) {
      toast('Elige una opción primero');
      return;
    }
    if (result) advance.mutate();
    else check.mutate();
  }, [selectedOptionId, result, advance, check]);

  return {
    selectedOptionId,
    result,
    select,
    submit,
    isChecked: result !== null,
    isPending: check.isPending || advance.isPending,
  };
}
