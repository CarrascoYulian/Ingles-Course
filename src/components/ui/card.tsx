import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const cardVariants = cva('rounded-6xl', {
  variants: {
    variant: {
      /** Tarjeta estándar: blanca con borde de 1 px. */
      default: 'bg-surface border border-line',
      /** Superficie oscura para tarjetas de "insight" y recomendaciones. */
      ink: 'bg-ink text-white',
      /** Placeholder / zona de soltar archivos. */
      dashed: 'bg-surface-subtle border-[1.5px] border-dashed border-line-dashed',
      /** Insignia obtenida. */
      earned: 'bg-warning-soft border border-warning-line',
    },
    padding: {
      none: '',
      sm: 'p-[15px]',
      md: 'p-[18px]',
      lg: 'px-[22px] py-5',
      xl: 'px-6 py-[22px]',
    },
    radius: {
      md: 'rounded-5xl',
      lg: 'rounded-6xl',
      xl: 'rounded-8xl',
      '2xl': 'rounded-10xl',
    },
  },
  defaultVariants: { variant: 'default', padding: 'md', radius: 'lg' },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant, padding, radius, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn(cardVariants({ variant, padding, radius }), className)} {...props} />
  );
});

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-start justify-between gap-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-title-sm font-bold text-fg tracking-tight-2', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-0.5 text-meta font-medium text-fg-ghost', className)} {...props} />;
}
