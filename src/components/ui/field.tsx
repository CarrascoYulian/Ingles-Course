'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import { forwardRef, useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export const Label = forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(function Label({ className, ...props }, ref) {
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn('text-meta font-bold text-fg-subtle', className)}
      {...props}
    />
  );
});

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  /** Recibe los `id`/`aria-*` ya calculados para enlazar etiqueta y ayuda. */
  children: (props: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean | undefined;
  }) => ReactNode;
}

/**
 * Envoltorio de campo accesible: enlaza `<label>`, texto de ayuda y mensaje
 * de error mediante `aria-describedby`, y anuncia el error con `role="alert"`.
 */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-[7px]', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error && (
        <p id={hintId} className="text-tiny font-medium text-fg-faint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-tiny font-bold text-danger-strong">
          {error}
        </p>
      )}
    </div>
  );
}
