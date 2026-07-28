'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

/**
 * Pestañas con subrayado. Radix aporta la navegación por flechas y la
 * relación `aria-controls` entre pestaña y panel.
 */
export const TabsList = forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        'flex gap-[18px] overflow-x-auto border-b border-line-soft scrollbar-none md:gap-[26px]',
        className,
      )}
      {...props}
    />
  );
});

export const TabsTrigger = forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(function TabsTrigger({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'shrink-0 cursor-pointer whitespace-nowrap border-b-2 border-transparent pb-3',
        'font-sans text-body-sm font-bold text-fg-faint',
        'transition-colors duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
        'hover:text-fg-subtle',
        'data-[state=active]:border-brand data-[state=active]:text-fg',
        className,
      )}
      {...props}
    />
  );
});

/**
 * El panel entra con un fundido corto y sin desplazamiento: cambiar de
 * pestaña es una acción frecuente y el movimiento la haría sentir lenta.
 */
export const TabsContent = forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        'pt-[18px] outline-none',
        'motion-safe:data-[state=active]:animate-fade-in',
        className,
      )}
      {...props}
    />
  );
});
