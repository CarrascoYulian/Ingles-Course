'use client';

import { useEffect, useRef, useState } from 'react';

import { BerthoLevelUpCelebration } from '@/components/duolingo/bertho-mascot';
import { Hearts } from '@/components/duolingo/stat-pills';
import { LevelPath } from '@/components/duolingo/level-path';
import { MissionCards } from '@/components/duolingo/mission-cards';
import { QuizCard } from '@/components/duolingo/quiz-card';
import { Progress } from '@/components/ui/progress';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import {
  playCorrectChime,
  playIncorrectBuzz,
  primeAudio,
  speakEnglish,
  startAmbientMusic,
  stopAmbientMusic,
} from '../lib/answer-audio';
import { PracticeHeader } from './practice-header';
import {
  usePracticeLevels,
  usePracticeQuestion,
  usePracticeRunner,
  usePracticeSession,
} from '../hooks/use-practice';
import { useSoundPreference } from '../hooks/use-sound-preference';

export function PracticeView() {
  const session = usePracticeSession();
  const levels = usePracticeLevels();
  const question = usePracticeQuestion(session.data?.step ?? 1);
  const runner = usePracticeRunner(question.data?.id, question.data?.answerCount ?? 1);
  const sound = useSoundPreference();
  const [showLevelUp, setShowLevelUp] = useState(false);

  // El ding/buzz suena al resolver el chequeo (llega por la mutation async),
  // pero el `AudioContext` sólo se puede desbloquear de forma síncrona
  // dentro de un gesto del usuario — por eso `primeAudio()` se llama en
  // `handleSubmit`, no acá.
  const lastAnnouncedResultRef = useRef<typeof runner.result>(null);
  useEffect(() => {
    if (!runner.result || runner.result === lastAnnouncedResultRef.current) return;
    lastAnnouncedResultRef.current = runner.result;

    // Si acierta la última pregunta de la sesión, activa la celebración de nivel
    if (runner.result.correct && session.data && session.data.step >= session.data.totalSteps) {
      setShowLevelUp(true);
    }

    if (!sound.enabled) return;

    if (runner.result.correct) {
      playCorrectChime();
      return;
    }
    playIncorrectBuzz();
    // Si falló, además de la que tocó (ya escuchada al seleccionar), que
    // oiga la respuesta correcta.
    const correctText = question.data?.options.find((option) =>
      runner.result?.correctOptionIds.includes(option.id),
    )?.text;
    if (correctText) {
      const timeout = window.setTimeout(() => speakEnglish(correctText, question.data?.voice), 350);
      return () => window.clearTimeout(timeout);
    }
  }, [runner.result, sound.enabled, question.data]);

  const handleSelect = (optionId: string) => {
    runner.select(optionId);
    if (!sound.enabled || runner.result) return;
    startAmbientMusic();
    const optionText = question.data?.options.find((option) => option.id === optionId)?.text;
    if (optionText) speakEnglish(optionText, question.data?.voice);
  };

  const handleSubmit = () => {
    if (sound.enabled && !runner.result) {
      primeAudio();
      startAmbientMusic();
    }
    runner.submit();
  };

  // La música ambiental sólo puede arrancar dentro de un gesto (ver arriba);
  // acá sólo la apagamos: al desactivar el sonido o al salir de la práctica.
  useEffect(() => {
    if (!sound.enabled) stopAmbientMusic();
    return () => stopAmbientMusic();
  }, [sound.enabled]);

  if (!session.data) {
    return (
      <div className="p-5">
        <LoadingRegion label="Cargando la práctica" />
        <Skeleton className="h-[420px] rounded-10xl" />
      </div>
    );
  }

  const currentLevel = levels.data?.find((level) => level.state === 'current');
  const percent = (session.data.step / session.data.totalSteps) * 100;

  return (
    <div className="flex min-h-dvh flex-col bg-surface-muted">
      <PracticeHeader
        session={session.data}
        levelTitle={currentLevel?.title ?? 'Nivel 1'}
        soundEnabled={sound.enabled}
        onToggleSound={() => {
          if (!sound.enabled) startAmbientMusic();
          sound.toggle();
        }}
      />

      <div className="flex flex-1 gap-[22px] p-[18px] md:px-[30px] md:py-[26px]">
        {levels.data && <LevelPath levels={levels.data} />}

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Progreso del ejercicio: en móvil ya vive en la cabecera. */}
          <div className="hidden items-center gap-3.5 lg:flex">
            <Progress
              value={percent}
              height={9}
              className="flex-1 bg-line"
              label="Progreso de la sesión"
            />
            <span className="text-meta font-extrabold text-fg-dim">
              {session.data.step} / {session.data.totalSteps}
            </span>
            <Hearts
              total={session.data.hearts.total}
              remaining={session.data.hearts.remaining}
            />
          </div>

          {question.data ? (
            <QuizCard
              question={question.data}
              selectedOptionIds={runner.selectedOptionIds}
              result={runner.result}
              isPending={runner.isPending}
              onSelect={handleSelect}
              onSubmit={handleSubmit}
            />
          ) : (
            <Skeleton className="h-[420px] rounded-10xl" />
          )}

          <div className="hidden lg:block">
            <MissionCards
              dailyXp={session.data.missions.dailyXp}
              weeklyStreak={session.data.missions.weeklyStreak}
              nextBadge={session.data.missions.nextBadge}
            />
          </div>
        </div>
      </div>

      <BerthoLevelUpCelebration
        open={showLevelUp}
        onClose={() => setShowLevelUp(false)}
        levelTitle={currentLevel?.title ?? '¡Nivel Completado!'}
      />
    </div>
  );
}
