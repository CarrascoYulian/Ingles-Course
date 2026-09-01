'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Variantes de botón del sistema de diseño EdTech moderno.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-sans cursor-pointer select-none font-bold',
    'transition-[background-color,border-color,color,box-shadow,transform,filter] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
    'disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    '[@media(hover:hover)_and_(pointer:fine)]:active:scale-[0.98]',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-brand text-white shadow-sm hover:bg-brand-hover hover:shadow-[0_0_20px_-3px_rgba(37,99,235,0.35)]',
        glow:
          'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-glow-brand hover:brightness-110 active:brightness-95',
        tactile:
          'bg-brand text-white border-b-4 border-blue-800 rounded-xl hover:bg-brand-hover active:border-b-0 active:translate-y-1',
        tactileSuccess:
          'bg-success text-white border-b-4 border-emerald-800 rounded-xl hover:bg-success-strong active:border-b-0 active:translate-y-1',
        glass:
          'bg-white/80 backdrop-blur-md text-fg-strong border border-line-strong hover:bg-white hover:border-brand/40 shadow-sm',
        ghost:
          'bg-surface text-fg-muted border border-line-strong hover:border-brand/40 hover:text-brand shadow-sm',
        danger:
          'bg-surface text-danger-strong border border-danger-line hover:bg-danger-soft active:bg-danger-soft',
        soft:
          'bg-surface-sunken text-fg-muted hover:bg-line-soft hover:text-fg',
        outline:
          'bg-transparent text-fg-muted border border-line-strong hover:border-brand hover:text-brand',
        dashed:
          'bg-surface text-fg-subtle border-[1.5px] border-dashed border-line-dashed hover:border-brand hover:text-brand',
        icon:
          'bg-surface text-fg-subtle border border-line-strong hover:border-brand/40 hover:text-brand shadow-sm',
        quiet:
          'bg-transparent text-fg-dim hover:text-fg hover:bg-surface-sunken',
      },
      size: {
        xs: 'px-2.5 py-1 rounded-lg text-caption font-bold',
        sm: 'px-3.5 py-1.5 rounded-lg text-meta font-bold',
        md: 'px-4 py-2.5 rounded-xl text-body-sm font-bold',
        lg: 'px-5 py-3 rounded-xl text-body font-extrabold',
        block: 'w-full px-5 py-3.5 rounded-2xl text-body-lg font-extrabold',
        square: 'size-8 rounded-lg text-label font-extrabold p-0',
        drop: 'w-full px-5 py-5 rounded-2xl text-body-sm font-bold',
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

