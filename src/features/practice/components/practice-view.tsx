'use client';

import { Hearts } from '@/components/duolingo/stat-pills';
import { LevelPath } from '@/components/duolingo/level-path';
import { MissionCards } from '@/components/duolingo/mission-cards';
import { QuizCard } from '@/components/duolingo/quiz-card';
import { Progress } from '@/components/ui/progress';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { PracticeHeader } from './practice-header';
import {
  usePracticeLevels,
  usePracticeQuestion,
  usePracticeRunner,
  usePracticeSession,
} from '../hooks/use-practice';

export function PracticeView() {
  const session = usePracticeSession();
  const levels = usePracticeLevels();
  const question = usePracticeQuestion(session.data?.step ?? 1);
  const runner = usePracticeRunner(question.data?.id);

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
      <PracticeHeader session={session.data} levelTitle={currentLevel?.title ?? 'Nivel 3'} />

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
              selectedOptionId={runner.selectedOptionId}
              result={runner.result}
              isPending={runner.isPending}
              onSelect={runner.select}
              onSubmit={runner.submit}
            />
          ) : (
            <Skeleton className="h-[420px] rounded-10xl" />
          )}

          <div className="hidden lg:block">
            <MissionCards
              dailyXp={{ earned: 45, goal: 60 }}
              weeklyStreak={{ done: 3, total: 5 }}
              nextBadge={{
                name: 'Maestro del pasado',
                requirement: '4 ejercicios más sin errores',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
