import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  /** Compacto para móvil (padding menor, como en el diseño). */
  compact?: boolean;
}

/**
 * Estado vacío. El texto siempre dice qué hacer a continuación, no sólo que
 * no hay nada: «Prueba con la matrícula completa (ING-000072)».
 */
export function EmptyState({
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-4xl border-[1.5px] border-dashed border-line-dashed bg-surface-subtle text-center',
        compact ? 'px-[18px] py-[30px]' : 'px-5 py-[38px]',
        className,
      )}
    >
      <p className={cn('font-bold text-fg', compact ? 'text-body' : 'text-body-lg')}>{title}</p>
      <p className={cn('mt-1 font-semibold text-fg-faint', compact ? 'text-meta' : 'text-label')}>
        {description}
      </p>
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}
