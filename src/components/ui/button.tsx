'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Cada variante corresponde a un botón real del diseño; no hay ninguna
 * inventada. El feedback de pulsación (`scale(.97)`) es común a todas: un
 * botón debe responder al dedo, no sólo al clic.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-sans cursor-pointer select-none',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
    'disabled:pointer-events-none',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    // Sólo en punteros finos: en táctil el :active se dispara al hacer scroll.
    '[@media(hover:hover)_and_(pointer:fine)]:active:scale-[0.97]',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white hover:bg-brand-hover disabled:bg-line disabled:text-fg-disabled disabled:cursor-not-allowed',
        ghost: 'bg-surface text-fg-muted border border-line-strong hover:border-fg-placeholder',
        danger: 'bg-surface text-danger-strong border border-danger-line hover:bg-danger-soft',
        soft: 'bg-surface-sunken text-fg-muted hover:bg-line',
        outline: 'bg-surface text-fg-muted border border-line-dashed hover:border-brand hover:text-brand',
        dashed: 'bg-surface text-fg-subtle border-[1.5px] border-dashed border-line-dashed hover:border-brand hover:text-brand',
        icon: 'bg-surface text-fg-subtle border border-line-strong hover:border-fg-placeholder',
        quiet: 'bg-transparent text-fg-dim hover:text-fg hover:bg-surface-sunken',
      },
      size: {
        xs: 'px-3 py-[7px] rounded-md text-meta font-bold',
        sm: 'px-[14px] py-2 rounded-lg text-meta font-bold',
        md: 'px-4 py-[10px] rounded-xl text-body-sm font-bold',
        lg: 'px-[22px] py-[11px] rounded-xl text-body-sm font-extrabold',
        /** Ancho completo y objetivo táctil ≥ 44 px, para móvil. */
        block: 'w-full px-[18px] py-[13px] rounded-3xl text-body-lg font-extrabold',
        /** Botón cuadrado de 28 px de las filas de contenido. */
        square: 'size-7 rounded-sm text-label font-extrabold p-0',
        /** Zona de arrastre a página completa. */
        drop: 'w-full px-[18px] py-[18px] rounded-6xl text-body-sm font-bold',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Renderiza el hijo en lugar de un `<button>` (p. ej. un `<Link>`). */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, type = 'button', ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});

export { buttonVariants };
