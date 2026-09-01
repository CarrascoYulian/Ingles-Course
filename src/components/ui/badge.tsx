import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-extrabold transition-colors',
  {
    variants: {
      tone: {
        neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700',
        brand: 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80',
        accent: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80',
        success: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80',
        warning: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80',
        danger: 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80',
        violet: 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/80',
        cyan: 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-800/80',
      },
      size: {
        sm: 'px-2.5 py-0.5 text-micro tracking-wide uppercase',
        md: 'px-3 py-1 text-caption tracking-badge font-bold',
        lg: 'px-3.5 py-1.5 text-meta font-bold',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'sm' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}

/**
 * Cuadrado con siglas (nivel MCER, tipo de bloque). Tamaño fijo, centrado.
 */
export function SquareBadge({
  className,
  size = 40,
  ...props
}: HTMLAttributes<HTMLDivElement> & { size?: 34 | 38 | 40 | 42 | 44 }) {
  const sizeClass = {
    34: 'size-[34px] rounded-xl text-body',
    38: 'size-[38px] rounded-xl text-caption font-extrabold',
    40: 'size-10 rounded-xl text-meta font-extrabold',
    42: 'size-[42px] rounded-2xl text-caption font-extrabold',
    44: 'size-11 rounded-2xl text-caption font-extrabold',
  }[size];

  return (
    <div
      className={cn('grid shrink-0 place-items-center font-extrabold shadow-sm', sizeClass, className)}
      {...props}
    />
  );
}

