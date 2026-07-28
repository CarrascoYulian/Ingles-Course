'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Icono decorativo a la izquierda (se marca aria-hidden). */
  icon?: ReactNode;
  invalid?: boolean;
}

/**
 * Campo de texto del diseño: fondo #F7F8FA, borde 1.5 px, radio 12 px.
 * El foco no se elimina, se sustituye por el anillo de marca.
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
        'w-full min-w-0 bg-transparent font-sans text-body-sm text-fg outline-none',
        'placeholder:text-fg-faint',
        'disabled:cursor-not-allowed disabled:opacity-60',
        !icon && 'rounded-2xl border-[1.5px] border-line-strong bg-surface-muted px-[14px] py-3',
        !icon && 'transition-colors duration-[160ms] focus:border-brand',
        !icon && invalid && 'border-danger-line',
        className,
      )}
      {...props}
    />
  );

  if (!icon) return field;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl bg-surface-sunken px-[14px] py-[9px]',
        'focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-1',
        'transition-shadow duration-[160ms]',
        className,
      )}
    >
      <span aria-hidden className="grid shrink-0 place-items-center text-fg-faint">
        {icon}
      </span>
      {field}
    </div>
  );
});
