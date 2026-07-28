import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: string;
  /** Variación respecto al periodo anterior. */
  delta?: { label: string; tone?: 'success' | 'neutral' | 'warning' };
  /** Barra, mini-gráfico o desglose bajo la cifra. */
  visual?: ReactNode;
  caption?: string;
  className?: string;
}

const DELTA_TONE = {
  success: 'text-success',
  neutral: 'text-fg-dim',
  warning: 'text-warning',
} as const;

/**
 * KPI del panel. La cifra domina; la variación va al lado, alineada por la
 * línea base, para leerse como una sola unidad de información.
 */
export function StatCard({ label, value, delta, visual, caption, className }: StatCardProps) {
  return (
    <Card className={cn('p-[15px] md:p-[18px]', className)}>
      <p className="text-tiny font-semibold text-fg-dim md:text-meta">{label}</p>

      <div className="mt-[5px] flex items-end gap-2 md:mt-2">
        <p className="text-[24px] font-extrabold leading-none tracking-display text-fg md:text-display">
          {value}
        </p>
        {delta?.label && (
          <p
            className={cn(
              'pb-[3px] text-tiny font-bold md:text-meta',
              DELTA_TONE[delta.tone ?? 'success'],
            )}
          >
            {delta.label}
          </p>
        )}
      </div>

      {visual && <div className="mt-3">{visual}</div>}
      {caption && <p className="mt-[7px] text-caption text-fg-ghost">{caption}</p>}
    </Card>
  );
}
