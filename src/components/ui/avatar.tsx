import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/format';

const SIZE_CLASS = {
  26: 'size-[26px] text-tiny',
  30: 'size-[30px] text-label',
  32: 'size-8 text-meta',
  34: 'size-[34px] text-meta',
  38: 'size-[38px] text-label',
  44: 'size-11 text-body',
} as const;

export interface AvatarProps {
  name: string;
  color?: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}

/**
 * Avatar de iniciales. No hay fotos en el producto: el color se deriva del
 * perfil, así que la misma persona conserva siempre el mismo tono.
 */
export function Avatar({ name, color = '#0F5257', size = 34, className }: AvatarProps) {
  return (
    <span
      aria-hidden
      style={{ backgroundColor: color }}
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-bold text-white',
        SIZE_CLASS[size],
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}
