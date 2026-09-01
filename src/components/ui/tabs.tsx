'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

/**
 * Pestañas modernas con indicador y tipografía de alto contraste.
 */
export const TabsList = forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        'flex gap-6 overflow-x-auto border-b border-slate-200 scrollbar-none md:gap-8',
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
        'relative shrink-0 cursor-pointer whitespace-nowrap border-b-2 border-transparent pb-3.5 pt-1',
        'font-sans text-body-sm font-bold text-slate-500',
        'transition-[color,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
        'hover:text-slate-900',
        'data-[state=active]:border-brand data-[state=active]:text-brand font-extrabold',
        className,
      )}
      {...props}
    />
  );
});

/**
 * Panel de contenido con entrada suave.
 */
export const TabsContent = forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        'pt-5 outline-none',
        'motion-safe:data-[state=active]:animate-fade-in',
        className,
      )}
      {...props}
    />
  );
});

