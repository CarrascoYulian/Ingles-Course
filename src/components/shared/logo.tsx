import { cn } from '@/lib/utils';
import { APP_NAME } from '@/constants';

const MARK_SIZE = {
  30: 'size-[30px] rounded-md text-[13px]',
  32: 'size-8 rounded-lg text-[13px]',
} as const;

export function LogoMark({
  size = 30,
  className,
}: {
  size?: keyof typeof MARK_SIZE;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center bg-brand font-extrabold tracking-tight-2 text-white',
        MARK_SIZE[size],
        className,
      )}
    >
      in
    </span>
  );
}

export interface LogoProps {
  /** Línea secundaria bajo el nombre (rol, contexto). */
  subtitle?: string;
  onInk?: boolean;
  className?: string;
}

export function Logo({ subtitle, onInk = false, className }: LogoProps) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={onInk ? 32 : 30} />
      <span className="flex min-w-0 flex-col leading-[1.15]">
        <span
          className={cn(
            'truncate text-title-xs font-bold tracking-tight-2',
            onInk ? 'text-white' : 'text-fg',
          )}
        >
          {onInk ? 'Panel docente' : APP_NAME}
        </span>
        {subtitle && (
          <span
            className={cn(
              'truncate text-tiny font-medium',
              onInk ? 'text-ink-fg-dim' : 'text-fg-dim',
            )}
          >
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
