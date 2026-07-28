'use client';

import { forwardRef, type TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

/** Mismo lenguaje visual que `Input`, multilínea. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full min-w-0 resize-none bg-transparent font-sans text-body-sm text-fg outline-none',
        'placeholder:text-fg-faint',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'rounded-2xl border-[1.5px] border-line-strong bg-surface-muted px-[14px] py-3',
        'transition-colors duration-[160ms] focus:border-brand',
        invalid && 'border-danger-line',
        className,
      )}
      {...props}
    />
  );
});
