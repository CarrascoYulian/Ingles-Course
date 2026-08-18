import { cn } from '@/lib/utils';

type ProgressTone = 'success' | 'accent' | 'warning' | 'danger' | 'brand' | 'ink';

const TONE_CLASS: Record<ProgressTone, string> = {
  success: 'bg-success',
  accent: 'bg-accent',
  warning: 'bg-warning',
  danger: 'bg-danger',
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
  /**
   * Color CSS explícito (p. ej. un `rgb()` interpolado) — sobreescribe
   * `tone` cuando la barra necesita un degradado continuo en vez de un
   * color fijo por umbral. Ver `StorageUsageWidget`/`storageBarColor`.
   */
  color?: string;
  height?: keyof typeof HEIGHT_CLASS;
  /** Pista oscura, para el reproductor sobre fondo #0B1620. */
  onInk?: boolean;
  className?: string;
  /** Etiqueta accesible. Si se omite, la barra se marca decorativa. */
  label?: string;
}

/**
 * Barra de progreso. Se anima `width` con una transición de 300 ms, y
 * `background-color` con una de 500 ms (más lenta a propósito: un cambio de
 * color debe leerse como una advertencia que aparece gradualmente, no como
 * un parpadeo).
 */
export function Progress({
  value,
  tone = 'success',
  color,
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
          'h-full rounded-pill transition-[width,background-color] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] [transition-duration:300ms,500ms]',
          !color && TONE_CLASS[tone],
        )}
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}
