'use client';

import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/**
 * Chip de filtro. Se expone como `role="switch"` porque alterna un estado
 * binario: los lectores de pantalla anuncian «activado/desactivado» en lugar
 * de leer sólo la etiqueta.
 */
export function Chip({ className, active = false, ...props }: ChipProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      className={cn(
        'shrink-0 cursor-pointer whitespace-nowrap rounded-pill border px-[13px] py-[7px]',
        'font-sans text-meta font-bold',
        'transition-[background-color,border-color,color,transform] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
        '[@media(hover:hover)_and_(pointer:fine)]:active:scale-[0.97]',
        active
          ? 'border-brand bg-brand text-white'
          : 'border-line-strong bg-surface text-fg-subtle hover:border-fg-placeholder',
        className,
      )}
      {...props}
    />
  );
}

/** Contenedor con desplazamiento horizontal para móvil. */
export function ChipRow({
  className,
  label,
  children,
}: {
  className?: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex items-center gap-2 overflow-x-auto scrollbar-none', className)}
    >
      {children}
    </div>
  );
}
