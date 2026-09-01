import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-extrabold transition-colors',
  {
    variants: {
      tone: {
        neutral: 'bg-slate-100 text-slate-700 border border-slate-200/80',
        brand: 'bg-blue-50 text-blue-700 border border-blue-200/80',
        accent: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
        success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
        warning: 'bg-amber-50 text-amber-700 border border-amber-200/80',
        danger: 'bg-rose-50 text-rose-700 border border-rose-200/80',
        violet: 'bg-purple-50 text-purple-700 border border-purple-200/80',
        cyan: 'bg-cyan-50 text-cyan-700 border border-cyan-200/80',
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

