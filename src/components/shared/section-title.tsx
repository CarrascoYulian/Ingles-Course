import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface SectionTitleProps {
  title: string;
  description?: string;
  /** Elemento a la derecha: leyenda, contador, enlace. */
  aside?: ReactNode;
  className?: string;
}

/** Cabecera interna de tarjeta: título + subtítulo opcional + acción. */
export function SectionTitle({ title, description, aside, className }: SectionTitleProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h3 className="text-title-sm font-bold tracking-tight-2 text-fg">{title}</h3>
        {description && (
          <p className="mt-0.5 text-meta font-medium text-fg-ghost">{description}</p>
        )}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}

/** Antetítulo en versalitas: «MÓDULO 4 · TIEMPOS PERFECTOS». */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'text-caption font-extrabold uppercase tracking-eyebrow text-brand md:text-tiny',
        className,
      )}
    >
      {children}
    </p>
  );
}
