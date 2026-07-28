import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-xs font-extrabold',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-sunken text-fg-dim',
        brand: 'bg-brand-soft text-brand',
        accent: 'bg-accent-soft text-accent',
        success: 'bg-success-soft text-success-strong',
        warning: 'bg-warning-tint text-warning-strong',
        danger: 'bg-danger-soft text-danger-strong',
        violet: 'bg-violet-soft text-violet-strong',
      },
      size: {
        sm: 'px-[9px] py-1 text-caption',
        md: 'px-[10px] py-[5px] text-caption tracking-badge',
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
    38: 'size-[38px] rounded-xl text-tiny',
    40: 'size-10 rounded-2xl text-meta',
    42: 'size-[42px] rounded-2xl text-caption',
    44: 'size-11 rounded-2xl text-[9.5px]',
  }[size];

  return (
    <div
      className={cn('grid shrink-0 place-items-center font-extrabold', sizeClass, className)}
      {...props}
    />
  );
}
