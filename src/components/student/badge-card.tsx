import { Star } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Badge as BadgeModel } from '@/types';

/**
 * Tarjeta de insignia. El estado no se comunica sólo por color: la obtenida
 * lleva estrella y la pendiente un punto, para no depender del contraste
 * ámbar/gris (WCAG 1.4.1).
 */
export function BadgeCard({ badge }: { badge: BadgeModel }) {
  const { earned, name, state } = badge;

  return (
    <Card
      variant={earned ? 'earned' : 'default'}
      className="flex flex-col gap-2 p-[18px]"
      aria-label={`${name}: ${state}`}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-[34px] place-items-center rounded-xl text-body font-extrabold text-white',
          earned ? 'bg-warning' : 'bg-fg-placeholder',
        )}
      >
        {earned ? <Star size={15} strokeWidth={2.6} fill="currentColor" /> : '·'}
      </span>

      <p
        className={cn(
          'text-body-sm font-extrabold',
          earned ? 'text-warning-deep' : 'text-fg-subtle',
        )}
      >
        {name}
      </p>
      <p
        className={cn(
          'text-caption font-bold',
          earned ? 'text-warning-strong' : 'text-fg-ghost',
        )}
      >
        {state}
      </p>
    </Card>
  );
}
