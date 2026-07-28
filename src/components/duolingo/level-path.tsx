import { Check, Lock } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { PracticeLevel } from '@/types';

/**
 * Ruta de niveles. Se marca como `<ol>` con `aria-current="step"` en el
 * nivel activo: la estructura es una secuencia, no una lista suelta.
 */
export function LevelPath({ levels }: { levels: PracticeLevel[] }) {
  return (
    <Card padding="none" radius="xl" className="hidden w-rail shrink-0 self-start p-[22px] lg:block">
      <h2 className="text-body-lg font-bold tracking-tight-2 text-fg">Ruta de niveles</h2>

      <ol className="mt-[18px] flex flex-col">
        {levels.map((level, index) => {
          const isLast = index === levels.length - 1;
          const isDone = level.state === 'done';
          const isCurrent = level.state === 'current';
          const nextLevel = levels[index + 1];
          const connectorDone = isDone && nextLevel?.state !== 'locked';

          return (
            <li
              key={level.id}
              aria-current={isCurrent ? 'step' : undefined}
              className="flex gap-3.5"
            >
              <div className="flex flex-col items-center">
                <span
                  aria-hidden
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-full text-label font-extrabold',
                    isDone && 'bg-success text-white',
                    isCurrent && 'bg-accent text-white ring-4 ring-accent-soft',
                    level.state === 'locked' && 'bg-surface-sunken text-fg-disabled',
                  )}
                >
                  {isDone ? (
                    <Check size={14} strokeWidth={3} />
                  ) : isCurrent ? (
                    level.order
                  ) : (
                    <Lock size={13} strokeWidth={2.2} />
                  )}
                </span>
                {!isLast && (
                  <span
                    aria-hidden
                    className={cn(
                      'min-h-[26px] w-0.5 flex-1',
                      isDone && connectorDone && 'bg-success',
                      isDone && !connectorDone && 'bg-accent',
                      !isDone && 'bg-line',
                    )}
                  />
                )}
              </div>

              <div className={cn(!isLast && 'pb-5')}>
                <p
                  className={cn(
                    'text-body-sm',
                    isCurrent ? 'font-extrabold text-accent' : 'font-bold',
                    level.state === 'locked' ? 'text-fg-disabled' : 'text-fg',
                  )}
                >
                  {level.title}
                </p>

                {isCurrent ? (
                  <>
                    <Progress
                      value={(level.completedSteps / level.totalSteps) * 100}
                      tone="accent"
                      height={5}
                      className="mt-[7px] w-[130px]"
                      label={`Avance de ${level.title}`}
                    />
                    <p className="mt-[5px] text-caption font-semibold text-fg-ghost">
                      En curso · {level.completedSteps}/{level.totalSteps}
                    </p>
                  </>
                ) : (
                  <p
                    className={cn(
                      'text-caption font-semibold',
                      isDone ? 'text-fg-ghost' : 'text-fg-locked',
                    )}
                  >
                    {isDone
                      ? `Completado · ${level.xp} XP`
                      : index === levels.findIndex((l) => l.state === 'locked')
                        ? `Termina el nivel ${level.order - 1} para abrir`
                        : 'Bloqueado'}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
