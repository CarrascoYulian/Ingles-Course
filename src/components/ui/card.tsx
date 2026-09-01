import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const cardVariants = cva(
  'transition-[box-shadow,border-color,transform,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
  {
    variants: {
      variant: {
        /** Tarjeta estándar: blanca con borde nítido y sombra suave */
        default: 'bg-surface border border-line shadow-card',
        /** Tarjeta interactiva con elevación sutil en hover */
        hover:
          'bg-surface border border-line shadow-card hover:shadow-card-hover hover:border-brand/30 hover:-translate-y-0.5 cursor-pointer',
        /** Tarjeta con vidrio translúcido y blur tecnológico */
        glass: 'bg-white/90 backdrop-blur-md border border-white/80 shadow-card',
        /** Superficie oscura tecnológica para reproductor o paneles cinema */
        ink: 'bg-ink text-white border border-ink-line shadow-player',
        /** Tarjeta con resplandor azul de enfoque / en curso */
        glow: 'bg-surface border border-brand/40 shadow-glow-brand',
        /** Placeholder / zona de soltar archivos */
        dashed: 'bg-surface-sunken border-[1.5px] border-dashed border-line-dashed hover:border-brand/40',
        /** Insignia obtenida / logro desbloqueado */
        earned: 'bg-gradient-to-br from-amber-50/80 to-amber-100/50 border border-amber-200/90 shadow-glow-gold text-fg',
      },
      padding: {
        none: '',
        sm: 'p-3.5',
        md: 'p-5',
        lg: 'p-6',
        xl: 'p-7',
      },
      radius: {
        md: 'rounded-xl',
        lg: 'rounded-2xl',
        xl: 'rounded-3xl',
        '2xl': 'rounded-3xl',
      },
    },
    defaultVariants: { variant: 'default', padding: 'md', radius: 'lg' },
  },
);

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
      className={cn('text-title font-extrabold text-fg tracking-tight-2', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-1 text-meta font-medium text-fg-soft leading-relaxed', className)} {...props} />;
}

