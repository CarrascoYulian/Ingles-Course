import { Lock, Sparkles, Trophy } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Badge as BadgeModel } from '@/types';

/**
 * Tarjeta de insignia estilo vitrina de trofeos con acabados metálicos y luz ambiental.
 */
export function BadgeCard({ badge }: { badge: BadgeModel }) {
  const { earned, name, state } = badge;

  return (
    <Card
      variant={earned ? 'earned' : 'default'}
      padding="none"
      radius="xl"
      className={cn(
        'group flex flex-col p-5 transition-all duration-200 border',
        earned
          ? 'border-amber-300/90 dark:border-amber-700/70 bg-gradient-to-br from-amber-50 via-white to-amber-100/40 dark:from-amber-950/50 dark:via-slate-900 dark:to-amber-950/30 shadow-glow-gold'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm opacity-70 hover:opacity-100',
      )}
      aria-label={`${name}: ${state}`}
    >
      <div className="flex items-center justify-between">
        <span
          aria-hidden
          className={cn(
            'grid size-11 place-items-center rounded-2xl text-body font-black transition-all duration-200 shadow-sm',
            earned
              ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-glow-gold ring-2 ring-amber-200 dark:ring-amber-800'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500',
          )}
        >
          {earned ? (
            <Trophy aria-hidden className="size-5.5 fill-white/80" />
          ) : (
            <Lock aria-hidden className="size-4.5" />
          )}
        </span>

        {earned && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/80 dark:bg-amber-900/60 px-2.5 py-0.5 text-micro font-black text-amber-800 dark:text-amber-200 uppercase tracking-wider">
            <Sparkles aria-hidden className="size-2.5" />
            Desbloqueado
          </span>
        )}
      </div>

      <div className="mt-4">
        <p
          className={cn(
            'text-body-sm font-extrabold tracking-tight',
            earned ? 'text-amber-950 dark:text-amber-100 font-black' : 'text-slate-700 dark:text-slate-200',
          )}
        >
          {name}
        </p>
        <p
          className={cn(
            'mt-0.5 text-caption font-semibold',
            earned ? 'text-amber-800 dark:text-amber-300' : 'text-slate-400 dark:text-slate-400',
          )}
        >
          {state}
        </p>
      </div>
    </Card>
  );
}

