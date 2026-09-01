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
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
} as const;

/**
 * KPI del panel de administración con diseño moderno de métricas.
 */
export function StatCard({ label, value, delta, visual, caption, className }: StatCardProps) {
  return (
    <Card
      padding="none"
      radius="xl"
      className={cn('border border-slate-200/90 bg-white p-5 shadow-card transition-all hover:border-slate-300', className)}
    >
      <div className="flex items-center justify-between">
        <p className="text-caption font-extrabold text-slate-500 uppercase tracking-wider">{label}</p>
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
        <p className="text-display-sm md:text-display font-black tracking-tight text-slate-900 tabular-nums leading-none">
          {value}
        </p>
      </div>

      {visual && <div className="mt-4">{visual}</div>}
      {caption && <p className="mt-2 text-caption font-medium text-slate-400">{caption}</p>}
    </Card>
  );
}

