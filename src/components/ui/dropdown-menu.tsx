'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/utils';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

/**
 * Igual que `DialogContent`: entra desde `scale(.96)`, nunca desde 0, y usa
 * `transform-origin` real (`transformOrigin` de Radix vía CSS var) porque
 * este sí está anclado a su disparador, a diferencia de un diálogo centrado.
 */
export const DropdownMenuContent = forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(function DropdownMenuContent({ className, sideOffset = 6, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'z-70 min-w-[190px] origin-[var(--radix-dropdown-menu-content-transform-origin)] rounded-2xl border border-line bg-surface p-1.5 shadow-card',
          'motion-safe:scale-100 motion-safe:opacity-100',
          'motion-safe:transition-[opacity,transform] motion-safe:duration-[180ms]',
          'motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]',
          'motion-safe:starting:scale-[0.96] motion-safe:starting:opacity-0',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
});

export const DropdownMenuItem = forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Item>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { variant?: 'default' | 'danger' }
>(function DropdownMenuItem({ className, variant = 'default', ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-label font-semibold text-fg outline-none',
        'data-[highlighted]:bg-surface-muted',
        variant === 'danger' && 'text-danger-strong data-[highlighted]:bg-danger-soft',
        className,
      )}
      {...props}
    />
  );
});

export function DropdownMenuSeparator({ className, ...props }: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn('my-1.5 h-px bg-line', className)}
      {...props}
    />
  );
}
