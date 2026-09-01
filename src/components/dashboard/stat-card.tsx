import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: string;
  delta?: { label: string; tone?: 'success' | 'neutral' | 'warning' };
  visual?: ReactNode;
  caption?: string;
  className?: string;
}

const DELTA_TONE = {
  success: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80',
  neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700',
  warning: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80',
} as const;

/**
 * KPI del panel de administración con diseño moderno de métricas.
 */
export function StatCard({ label, value, delta, visual, caption, className }: StatCardProps) {
  return (
    <Card
      padding="none"
      radius="xl"
      className={cn('border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card transition-all hover:border-slate-300 dark:hover:border-slate-700', className)}
    >
      <div className="flex items-center justify-between">
        <p className="text-caption font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
        {delta?.label && (
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-black tabular-nums',
              DELTA_TONE[delta.tone ?? 'success'],
            )}
          >
            {delta.label}
          </span>
        )}
      </div>

      <div className="mt-3">
        <p className="text-display-sm md:text-display font-black tracking-tight text-slate-900 dark:text-white tabular-nums leading-none">
          {value}
        </p>
      </div>

      {visual && <div className="mt-4">{visual}</div>}
      {caption && <p className="mt-2 text-caption font-medium text-slate-400 dark:text-slate-500">{caption}</p>}
    </Card>
  );
}

