'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { forwardRef, type ComponentPropsWithoutRef, type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const DialogOverlay = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        'fixed inset-0 z-70 grid place-items-center overflow-y-auto bg-[rgb(15_23_42/0.42)] p-6 backdrop-blur-[3px]',
        'motion-safe:animate-fade-in',
        className,
      )}
      {...props}
    />
  );
});

/**
 * El diálogo mantiene `transform-origin: center`: no está anclado a un
 * disparador concreto, aparece centrado en el viewport. (Los popovers sí
 * deben escalar desde su origen; los modales no.)
 *
 * Entra desde `scale(.96)`, nunca desde 0 — nada aparece de la nada.
 */
export const DialogContent = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { width?: 420 | 460 | 560 | 720 }
>(function DialogContent({ className, children, width = 460, ...props }, ref) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay>
        <DialogPrimitive.Content
          ref={ref}
          style={{ maxWidth: width }}
          className={cn(
            'relative w-full origin-center rounded-9xl bg-surface px-7 py-[26px] shadow-dialog',
            // Entrada con @starting-style: sin useEffect ni estado "mounted".
            // Desde scale(.96), nunca desde 0.
            'motion-safe:scale-100 motion-safe:opacity-100',
            'motion-safe:transition-[opacity,transform] motion-safe:duration-[220ms]',
            'motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]',
            'motion-safe:starting:scale-[0.96] motion-safe:starting:opacity-0',
            className,
          )}
          {...props}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogOverlay>
    </DialogPrimitive.Portal>
  );
});

export const DialogTitle = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function DialogTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-title-lg font-extrabold tracking-heading text-fg', className)}
      {...props}
    />
  );
});

export const DialogDescription = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function DialogDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('mt-1.5 text-body-sm font-medium leading-normal text-fg-soft', className)}
      {...props}
    />
  );
});

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-6 flex flex-col-reverse gap-[9px] sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}
