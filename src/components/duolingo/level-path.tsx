'use client';

import { Check, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useState } from 'react';

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { PracticeLevel } from '@/types';

const PAGE_SIZE = 6;

/**
 * Ruta de niveles. Se marca como `<ol>` con `aria-current="step"` en el
 * nivel activo: la estructura es una secuencia, no una lista suelta.
 *
 * Paginada de a `PAGE_SIZE`: con la ventana que ya recorta la API (hasta 26
 * niveles alrededor del actual, ver `/api/practice/levels`), mostrarlos
 * todos de un tirón alargaba la página entera — el rail terminaba siendo
 * más alto que la tarjeta del ejercicio. Arranca en la página que contiene
 * el nivel en curso, no en la primera.
 */
export function LevelPath({ levels }: { levels: PracticeLevel[] }) {
  const currentIndex = levels.findIndex((level) => level.state === 'current');
  const totalPages = Math.max(1, Math.ceil(levels.length / PAGE_SIZE));
  const [page, setPage] = useState(() =>
    currentIndex === -1 ? 0 : Math.floor(currentIndex / PAGE_SIZE),
  );

  const start = page * PAGE_SIZE;
  const pageLevels = levels.slice(start, start + PAGE_SIZE);

  return (
    <Card padding="none" radius="xl" className="hidden w-rail shrink-0 self-start p-[22px] lg:block">
      <div className="flex items-center justify-between">
        <h2 className="text-body-lg font-bold tracking-tight-2 text-fg">Ruta de niveles</h2>
        {totalPages > 1 && (
          <span className="text-caption font-bold text-fg-ghost">
            {page + 1}/{totalPages}
          </span>
        )}
      </div>

      <ol className="mt-[18px] flex flex-col">
        {pageLevels.map((level, index) => {
          const isLast = index === pageLevels.length - 1;
          const isDone = level.state === 'done';
          const isCurrent = level.state === 'current';
          const nextLevel = pageLevels[index + 1];
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
                      : level.id === levels.find((l) => l.state === 'locked')?.id
                        ? `Termina el nivel ${level.order - 1} para abrir`
                        : 'Bloqueado'}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {totalPages > 1 && (
        <div className="mt-[14px] flex items-center justify-between border-t border-line-soft pt-[14px]">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(0, prev - 1))}
            disabled={page === 0}
            aria-label="Niveles anteriores"
            className="grid size-7 place-items-center rounded-md text-fg-muted transition-colors duration-[160ms] hover:bg-surface-sunken disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft aria-hidden size={16} strokeWidth={2.4} />
          </button>
          <span className="text-caption font-bold text-fg-ghost">
            Niveles {start + 1}–{Math.min(start + PAGE_SIZE, levels.length)} de {levels.length}
          </span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
            disabled={page === totalPages - 1}
            aria-label="Niveles siguientes"
            className="grid size-7 place-items-center rounded-md text-fg-muted transition-colors duration-[160ms] hover:bg-surface-sunken disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight aria-hidden size={16} strokeWidth={2.4} />
          </button>
        </div>
      )}
    </Card>
  );
}
