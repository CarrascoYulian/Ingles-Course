import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
  /** Compacto para móvil o sidebars */
  compact?: boolean;
}

/**
 * Estado vacío moderno con borde suave y texto de alta legibilidad.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/70 backdrop-blur-sm text-center shadow-sm',
        compact ? 'px-4 py-6' : 'px-6 py-10',
        className,
      )}
    >
      {icon && (
        <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm">
          {icon}
        </div>
      )}
      <p className={cn('font-extrabold text-slate-900', compact ? 'text-body-sm' : 'text-body-lg')}>{title}</p>
      {description && (
        <p className={cn('mt-1.5 font-medium text-slate-500 max-w-md text-pretty', compact ? 'text-caption' : 'text-body-sm')}>
          {description}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

