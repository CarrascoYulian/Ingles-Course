'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Icono decorativo a la izquierda */
  icon?: ReactNode;
  invalid?: boolean;
}

/**
 * Campo de texto moderno con halo de luz en foco.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, icon, invalid, ...props },
  ref,
) {
  const field = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full min-w-0 bg-transparent font-sans text-body-sm text-fg outline-none font-medium',
        'placeholder:text-slate-400 dark:placeholder:text-slate-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        !icon &&
          'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 shadow-sm',
        !icon &&
          'transition-[border-color,box-shadow] duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20',
        !icon && invalid && 'border-rose-300 focus:ring-rose-200',
        className,
      )}
      {...props}
    />
  );

  if (!icon) return field;

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 shadow-sm',
        'focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20',
        'transition-[border-color,box-shadow] duration-150',
        invalid && 'border-rose-300 focus-within:ring-rose-200',
        className,
      )}
    >
      <span aria-hidden className="grid shrink-0 place-items-center text-slate-400 dark:text-slate-500">
        {icon}
      </span>
      {field}
    </div>
  );
});

