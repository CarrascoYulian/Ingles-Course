import { cn } from '@/lib/utils';

type ProgressTone = 'success' | 'accent' | 'warning' | 'brand' | 'ink';

const TONE_CLASS: Record<ProgressTone, string> = {
  success: 'bg-success',
  accent: 'bg-accent',
  warning: 'bg-warning',
  brand: 'bg-brand',
  ink: 'bg-accent',
};

const HEIGHT_CLASS = {
  4: 'h-1',
  5: 'h-[5px]',
  6: 'h-1.5',
  8: 'h-2',
  9: 'h-[9px]',
} as const;

export interface ProgressProps {
  /** 0-100. */
  value: number;
  tone?: ProgressTone;
  height?: keyof typeof HEIGHT_CLASS;
  /** Pista oscura, para el reproductor sobre fondo #0B1620. */
  onInk?: boolean;
  className?: string;
  /** Etiqueta accesible. Si se omite, la barra se marca decorativa. */
  label?: string;
}

/**
 * Barra de progreso. Se anima únicamente `width` con una transición de
 * 300 ms: es un cambio poco frecuente y comunica avance, no interacción.
 */
export function Progress({
  value,
  tone = 'success',
  height = 4,
  onInk = false,
  className,
  label,
}: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      role={label ? 'progressbar' : 'presentation'}
      aria-label={label}
      aria-valuenow={label ? Math.round(clamped) : undefined}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      className={cn(
        'w-full overflow-hidden rounded-pill',
        HEIGHT_CLASS[height],
        onInk ? 'bg-ink-line' : 'bg-line-soft',
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-pill transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]',
          TONE_CLASS[tone],
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
