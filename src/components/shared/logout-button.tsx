'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ROUTES } from '@/constants/routes';
import { IS_DEMO_MODE } from '@/lib/env';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export interface LogoutButtonProps {
  /** Variante oscura para la barra lateral del panel docente. */
  onInk?: boolean;
  /** Sólo el icono, sin texto — para cabeceras móviles con poco espacio. */
  iconOnly?: boolean;
  className?: string;
}

/**
 * Cierra la sesión, sea demo o Supabase real, y vuelve a /login.
 *
 * No existía ningún punto de salida en la interfaz: una vez dentro, no
 * había forma de cambiar de cuenta o de rol sin borrar cookies a mano.
 */
export function LogoutButton({ onInk = false, iconOnly = false, className }: LogoutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleLogout = async () => {
    setPending(true);
    try {
      if (IS_DEMO_MODE) {
        await fetch('/api/demo-auth/logout', { method: 'POST' });
      } else {
        await getSupabaseBrowserClient()?.auth.signOut();
      }
      router.push(ROUTES.login);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      aria-label="Cerrar sesión"
      className={cn(
        'flex items-center gap-2 rounded-xl text-body-sm font-semibold',
        'transition-colors duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] disabled:opacity-60',
        iconOnly ? 'size-9 justify-center' : 'px-3 py-2.5',
        onInk
          ? 'text-ink-nav hover:bg-ink-raised hover:text-white'
          : 'text-fg-dim hover:bg-surface-sunken hover:text-fg',
        className,
      )}
    >
      <LogOut aria-hidden size={16} strokeWidth={1.9} />
      {!iconOnly && (pending ? 'Saliendo…' : 'Cerrar sesión')}
    </button>
  );
}
