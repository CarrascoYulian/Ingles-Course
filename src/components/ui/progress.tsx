import { cn } from '@/lib/utils';

type ProgressTone = 'success' | 'accent' | 'warning' | 'danger' | 'brand' | 'ink' | 'cyan';

const TONE_CLASS: Record<ProgressTone, string> = {
  success: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
  accent: 'bg-gradient-to-r from-blue-600 to-indigo-500',
  warning: 'bg-gradient-to-r from-amber-500 to-amber-400',
  danger: 'bg-gradient-to-r from-rose-500 to-red-400',
  brand: 'bg-gradient-to-r from-blue-600 to-cyan-500',
  ink: 'bg-gradient-to-r from-cyan-400 to-blue-400',
  cyan: 'bg-gradient-to-r from-cyan-500 to-teal-400',
};

const HEIGHT_CLASS = {
  4: 'h-1',
  5: 'h-1.5',
  6: 'h-2',
  8: 'h-2.5',
  9: 'h-3',
} as const;

export interface ProgressProps {
  /** 0-100. */
  value: number;
  tone?: ProgressTone;
  /**
   * Color CSS explícito
   */
  color?: string;
  height?: keyof typeof HEIGHT_CLASS;
  /** Pista oscura */
  onInk?: boolean;
  className?: string;
  /** Etiqueta accesible. Si se omite, la barra se marca decorativa. */
  label?: string;
}

/**
 * Barra de progreso con gradiente y acabado de alta fidelidad.
 */
export function Progress({
  value,
  tone = 'success',
  color,
  height = 6,
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
        'w-full overflow-hidden rounded-full shadow-inner',
        HEIGHT_CLASS[height],
        onInk ? 'bg-slate-800' : 'bg-slate-100 border border-slate-200/50',
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width,background-color] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] relative',
          !color && TONE_CLASS[tone],
        )}
        style={{ width: `${clamped}%`, backgroundColor: color }}
      >
        {clamped > 0 && clamped < 100 && (
          <span className="absolute right-0 top-0 h-full w-2 bg-white/40 blur-[1px] rounded-full" />
        )}
      </div>
    </div>
  );
}

