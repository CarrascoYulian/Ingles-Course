'use client';

import { useState } from 'react';

import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/shared/section-title';
import { cn } from '@/lib/utils';
import type { ActivityEvent } from '@/types';

const TONE_DOT: Record<ActivityEvent['tone'], string> = {
  success: 'bg-success',
  info: 'bg-accent',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

/** Antes de la "Mostrar más" ya se veían todas las filas de golpe — con
 * mucha actividad, la tarjeta crecía sin límite y empujaba el resto del
 * dashboard fuera de la pantalla. */
const COLLAPSED_COUNT = 5;

/**
 * Actividad reciente. `aria-live="polite"` anuncia las entradas nuevas sin
 * interrumpir lo que el usuario esté leyendo.
 */
export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? events : events.slice(0, COLLAPSED_COUNT);
  const hasMore = events.length > COLLAPSED_COUNT;

  return (
    <Card padding="lg" radius="xl">
      <SectionTitle
        title="Actividad reciente"
        aside={<span className="text-tiny font-bold text-accent">En vivo</span>}
      />

      <ol
        aria-live="polite"
        className={cn('mt-3 flex flex-col md:mt-3.5', expanded && 'max-h-[360px] overflow-y-auto')}
      >
        {visible.map((event, index) => (
          <li
            key={event.id}
            className={cn(
              'flex gap-2.5 py-2.5 md:gap-3 md:py-[11px]',
              index < visible.length - 1 && 'border-b border-surface-sunken',
            )}
          >
            <span
              aria-hidden
              className={cn('mt-[5px] size-1.5 shrink-0 rounded-full md:mt-1.5 md:size-[7px]', TONE_DOT[event.tone])}
            />
            <div className="min-w-0 flex-1">
              <p className="text-label font-semibold text-fg-strong md:text-body-sm">
                {event.segments.map((segment, i) =>
                  segment.strong ? (
                    <strong key={i} className="font-bold text-fg">
                      {segment.text}
                    </strong>
                  ) : (
                    <span key={i}>{segment.text}</span>
                  ),
                )}
              </p>
              <p className="mt-0.5 text-micro font-bold text-fg-ghost md:text-caption md:font-semibold">
                {event.timeAgo}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 w-full rounded-xl py-2 text-center text-tiny font-bold text-fg-dim transition-colors hover:bg-surface-sunken hover:text-fg"
        >
          {expanded ? 'Mostrar menos' : `Mostrar ${events.length - COLLAPSED_COUNT} más`}
        </button>
      )}
    </Card>
  );
}
