'use client';

import { Sparkles, Volume2 } from 'lucide-react';
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
  selectedOptionIds: string[];
  result: AnswerResult | null;
  isPending: boolean;
  onSelect: (optionId: string) => void;
  onSubmit: () => void;
}

function resolveState(
  optionId: string,
  selectedOptionIds: string[],
  result: AnswerResult | null,
): OptionState {
  if (result) {
    if (result.correctOptionIds.includes(optionId)) return 'correct';
    if (selectedOptionIds.includes(optionId)) return 'incorrect';
    return 'idle';
  }
  return selectedOptionIds.includes(optionId) ? 'selected' : 'idle';
}

/**
 * Tarjeta de ejercicio de práctica con diseño gamificado de alta interactividad.
 */
export function QuizCard({
  question,
  selectedOptionIds,
  result,
  isPending,
  onSelect,
  onSubmit,
}: QuizCardProps) {
  const multiSelect = question.answerCount > 1;
  const correctKey = question.options
    .filter((option) => result?.correctOptionIds.includes(option.id))
    .map((option) => option.key)
    .join(' o ');

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
      radius="xl"
      padding="none"
      className="flex flex-col border border-slate-200/90 bg-white p-5 md:p-8 shadow-card"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge tone="brand" size="md">
            {question.category}
          </Badge>
          {multiSelect && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-micro font-bold text-slate-600">
              Selección múltiple ({question.answerCount})
            </span>
          )}
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-caption font-extrabold text-amber-800 shadow-sm">
          <Sparkles aria-hidden className="size-3 text-amber-500" />
          +{question.xpReward} XP
        </span>
      </div>

      <h1 className="mt-4 text-heading font-black tracking-tight text-slate-900 md:text-heading-lg text-pretty">
        {question.prompt}
      </h1>

      {/* Caja de frase / fuente con pronunciación */}
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 md:p-5">
        <p className="text-body-lg md:text-title font-extrabold text-slate-900 leading-relaxed">
          {question.sourceText}
        </p>

        {question.audioKey && (
          <Button
            variant="glass"
            size="sm"
            onClick={playAudio}
            disabled={audioState === 'loading'}
            className="w-fit rounded-xl gap-2 font-extrabold text-brand"
          >
            <Volume2 aria-hidden className="size-4 animate-pulse" />
            <span>
              {audioState === 'loading'
                ? 'Cargando voz…'
                : audioState === 'playing'
                  ? 'Pausar pronunciación'
                  : 'Escuchar pronunciación'}
            </span>
          </Button>
        )}
      </div>

      {/* Opciones de respuesta */}
      <div
        role={multiSelect ? 'group' : 'radiogroup'}
        aria-label={question.prompt}
        className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2"
      >
        {question.options.map((option) => (
          <QuizOption
            key={option.id}
            option={option}
            role={multiSelect ? 'checkbox' : 'radio'}
            state={resolveState(option.id, selectedOptionIds, result)}
            disabled={result !== null}
            onSelect={() => onSelect(option.id)}
          />
        ))}
      </div>

      {/* Barra de acción inferior */}
      <div className="mt-8 flex flex-col gap-4 border-t border-slate-100 pt-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <QuizFeedback
            result={result}
            hasSelection={selectedOptionIds.length > 0}
            correctKey={correctKey}
            xpReward={question.xpReward}
          />
        </div>

        <Button
          size="lg"
          variant={result ? (result.correct ? 'tactileSuccess' : 'tactile') : 'tactile'}
          onClick={onSubmit}
          disabled={selectedOptionIds.length === 0 || isPending}
          className="w-full md:w-auto md:min-w-[160px] text-body font-black"
        >
          {result ? 'Continuar →' : 'Comprobar'}
        </Button>
      </div>
    </Card>
  );
}

