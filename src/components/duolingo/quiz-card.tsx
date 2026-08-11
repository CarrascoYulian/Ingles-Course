'use client';

import { Volume2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { QuizFeedback } from './quiz-feedback';
import { QuizOption, type OptionState } from './quiz-option';
import type { AnswerResult } from '@/services';
import type { PracticeQuestion } from '@/types';

export interface QuizCardProps {
  question: PracticeQuestion;
  selectedOptionId: string | null;
  result: AnswerResult | null;
  isPending: boolean;
  onSelect: (optionId: string) => void;
  onSubmit: () => void;
}

/**
 * La opción acertada sólo se conoce a través de `result`: la pregunta llega
 * al navegador sin ella, así que no se puede inspeccionar antes de contestar.
 */
function resolveState(
  optionId: string,
  selectedOptionId: string | null,
  result: AnswerResult | null,
): OptionState {
  if (result) {
    if (optionId === result.correctOptionId) return 'correct';
    if (optionId === selectedOptionId) return 'incorrect';
    return 'idle';
  }
  return optionId === selectedOptionId ? 'selected' : 'idle';
}

/** Ejercicio de práctica: enunciado, opciones y barra de acción. */
export function QuizCard({
  question,
  selectedOptionId,
  result,
  isPending,
  onSelect,
  onSubmit,
}: QuizCardProps) {
  const correctKey =
    question.options.find((option) => option.id === result?.correctOptionId)?.key ?? 'A';

  // Antes este botón sólo mostraba un toast fingiendo reproducir algo — no
  // existía ningún archivo de audio detrás. Ahora, si la pregunta tiene un
  // `audioKey` real, pide su URL firmada y reproduce audio de verdad; si no
  // lo tiene (el caso de las 80 preguntas actuales del banco), el botón ni
  // siquiera se muestra, en vez de fingir.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing'>('idle');

  const playAudio = async () => {
    if (!question.audioKey || audioState === 'loading') return;
    if (audioState === 'playing') {
      audioRef.current?.pause();
      setAudioState('idle');
      return;
    }
    setAudioState('loading');
    try {
      const response = await fetch(`/api/media?key=${encodeURIComponent(question.audioKey)}`);
      if (!response.ok) throw new Error('No disponible');
      const { url } = (await response.json()) as { url: string };
      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      audio.src = url;
      audio.onended = () => setAudioState('idle');
      await audio.play();
      setAudioState('playing');
    } catch {
      toast.error('No se pudo reproducir el audio.');
      setAudioState('idle');
    }
  };

  return (
    <Card
      radius="2xl"
      padding="none"
      className="flex flex-1 flex-col px-[18px] py-5 md:px-[38px] md:pb-[30px] md:pt-[34px]"
    >
      <div className="flex items-center gap-2.5">
        <Badge tone="brand" size="md">
          {question.category}
        </Badge>
        <span className="text-tiny font-bold text-fg-ghost md:text-meta">
          +{question.xpReward} XP
        </span>
      </div>

      <h1 className="mt-3 text-[21px] font-extrabold tracking-heading text-fg text-pretty md:mt-4 md:text-display-sm">
        {question.prompt}
      </h1>

      <div className="mt-3 rounded-4xl bg-surface-muted px-4 py-[15px] md:mt-2.5 md:px-5 md:py-[18px]">
        <p className="text-title font-bold text-fg-strong text-pretty md:text-heading-sm">
          {question.sourceText}
        </p>
        {question.audioKey && (
          <Button
            variant="ghost"
            size="xs"
            onClick={playAudio}
            disabled={audioState === 'loading'}
            className="mt-3 rounded-lg"
          >
            <Volume2 aria-hidden size={14} strokeWidth={2} />
            <span className="md:hidden">
              {audioState === 'loading' ? 'Cargando…' : audioState === 'playing' ? 'Pausar' : 'Escuchar'}
            </span>
            <span className="hidden md:inline">
              {audioState === 'loading'
                ? 'Cargando audio…'
                : audioState === 'playing'
                  ? 'Pausar audio'
                  : 'Escuchar audio'}
            </span>
          </Button>
        )}
      </div>

      <div
        role="radiogroup"
        aria-label={question.prompt}
        className="mt-[18px] flex flex-col gap-[9px] md:mt-[22px] md:grid md:grid-cols-2 md:gap-3"
      >
        {question.options.map((option) => (
          <QuizOption
            key={option.id}
            option={option}
            state={resolveState(option.id, selectedOptionId, result)}
            disabled={result !== null}
            onSelect={() => onSelect(option.id)}
          />
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-[18px] md:mt-[22px] md:flex-row md:items-center md:justify-between md:gap-5 md:border-t md:border-line-soft md:pt-5">
        <div className="min-w-0 md:order-1">
          <QuizFeedback
            result={result}
            hasSelection={selectedOptionId !== null}
            correctKey={correctKey}
            xpReward={question.xpReward}
          />
        </div>
        <Button
          size="block"
          onClick={onSubmit}
          disabled={!selectedOptionId || isPending}
          className="md:order-2 md:w-auto md:rounded-xl md:px-[22px] md:py-[11px] md:text-body-sm"
        >
          {result ? 'Continuar' : 'Comprobar'}
        </Button>
      </div>
    </Card>
  );
}
