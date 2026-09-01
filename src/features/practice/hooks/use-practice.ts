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
export function usePracticeRunner(questionId: string | undefined, answerCount: number = 1) {
  const queryClient = useQueryClient();
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [result, setResult] = useState<AnswerResult | null>(null);

  const check = useMutation({
    mutationFn: () => {
      if (!questionId || selectedOptionIds.length === 0) throw new Error('Sin selección');
      return backend.practice.submitAnswer(questionId, selectedOptionIds);
    },
    onSuccess: (answer) => {
      setResult(answer);
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.practice, 'session'] });
      if (answer.correct) toast(`+${answer.xpGained} XP · racha intacta`);
      else if (answer.partial) toast(`+${answer.xpGained} XP · acierto parcial`);
    },
  });

  const advance = useMutation({
    mutationFn: () => backend.practice.advance(),
    onSuccess: () => {
      setSelectedOptionIds([]);
      setResult(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.practice });
    },
  });

  const select = useCallback(
    (optionId: string) => {
      if (result) return; // Ya corregido: la selección queda congelada.
      setSelectedOptionIds((current) => {
        if (current.includes(optionId)) return current.filter((id) => id !== optionId);
        // Preguntas de 1 respuesta se comportan como radio: la nueva reemplaza a la anterior.
        if (answerCount <= 1) return [optionId];
        if (current.length >= answerCount) return current;
        return [...current, optionId];
      });
    },
    [result, answerCount],
  );

  const submit = useCallback(() => {
    if (selectedOptionIds.length === 0) {
      toast(answerCount > 1 ? 'Elige tus opciones primero' : 'Elige una opción primero');
      return;
    }
    if (result) advance.mutate();
    else check.mutate();
  }, [selectedOptionIds, result, advance, check, answerCount]);

  return {
    selectedOptionIds,
    result,
    select,
    submit,
    isChecked: result !== null,
    isPending: check.isPending || advance.isPending,
  };
}
