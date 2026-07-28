import { cn } from '@/lib/utils';
import { formatInteger } from '@/lib/format';

export interface StatPillsProps {
  streak: number;
  xp: number;
  coins: number;
  /** En móvil las píldoras se reparten el ancho; en escritorio se ajustan. */
  stretch?: boolean;
  className?: string;
}

interface Pill {
  dot: string;
  bg: string;
  fg: string;
  full: string;
  short: string;
  label: string;
}

/** Racha, XP y monedas. Réplica exacta de las tres píldoras del diseño. */
export function StatPills({ streak, xp, coins, stretch = false, className }: StatPillsProps) {
  const pills: Pill[] = [
    {
      dot: 'bg-warning',
      bg: 'bg-warning-soft',
      fg: 'text-warning-strong',
      full: `Racha ${streak} días`,
      short: `Racha ${streak}`,
      label: `Racha de ${streak} días`,
    },
    {
      dot: 'bg-success',
      bg: 'bg-success-soft',
      fg: 'text-success-strong',
      full: `${formatInteger(xp)} XP`,
      short: `${formatInteger(xp)} XP`,
      label: `${xp} puntos de experiencia`,
    },
    {
      dot: 'bg-fg-dim',
      bg: 'bg-surface-sunken',
      fg: 'text-fg-muted',
      full: `${formatInteger(coins)} monedas`,
      short: formatInteger(coins),
      label: `${coins} monedas`,
    },
  ];

  return (
    <ul className={cn('flex items-center gap-[7px] md:gap-2.5', className)}>
      {pills.map((pill) => (
        <li
          key={pill.label}
          aria-label={pill.label}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-md px-3 py-[7px] md:gap-[7px] md:rounded-lg md:px-[13px] md:py-2',
            pill.bg,
            stretch && 'flex-1',
          )}
        >
          <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full md:size-[7px]', pill.dot)} />
          <span aria-hidden className={cn('text-tiny font-extrabold md:text-label', pill.fg)}>
            <span className="md:hidden">{pill.short}</span>
            <span className="hidden md:inline">{pill.full}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Vidas restantes del ejercicio. */
export function Hearts({ total, remaining }: { total: number; remaining: number }) {
  return (
    <p
      aria-label={`${remaining} de ${total} intentos restantes`}
      className="flex shrink-0 gap-[3px] md:gap-1"
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className={cn(
            'size-2 rounded-full md:size-[9px]',
            index < total - remaining ? 'bg-danger' : 'bg-line',
          )}
        />
      ))}
    </p>
  );
}
