'use client';

import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/**
 * Chip de filtro tecnológico y accesible.
 */
export function Chip({ className, active = false, ...props }: ChipProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      className={cn(
        'shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-1.5',
        'font-sans text-meta font-bold',
        'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
        '[@media(hover:hover)_and_(pointer:fine)]:active:scale-[0.97]',
        active
          ? 'border-brand bg-brand text-white shadow-[0_0_14px_-2px_rgba(37,99,235,0.35)]'
          : 'border-slate-200 bg-white text-slate-600 hover:border-brand/40 hover:text-brand shadow-sm',
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
      className={cn('flex items-center gap-2 overflow-x-auto scrollbar-none py-1', className)}
    >
      {children}
    </div>
  );
}

