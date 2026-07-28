import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Acciones alineadas a la derecha en escritorio, debajo en móvil. */
  actions?: ReactNode;
  className?: string;
  /** `h1` en páginas, `h2` cuando va dentro de otra jerarquía. */
  as?: 'h1' | 'h2';
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  as: Heading = 'h1',
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5',
        className,
      )}
    >
      <div className="min-w-0">
        <Heading className="truncate text-heading font-extrabold tracking-heading text-fg">
          {title}
        </Heading>
        {description && (
          <p className="mt-0.5 text-body-sm font-medium text-fg-dim">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2.5">{actions}</div>}
    </div>
  );
}
