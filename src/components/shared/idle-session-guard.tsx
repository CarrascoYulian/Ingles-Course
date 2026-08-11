'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { ROUTES } from '@/constants/routes';
import { IS_DEMO_MODE } from '@/lib/env';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Antes una sesión iniciada quedaba viva indefinidamente mientras el
 * refresh token siguiera vigente — con más usuarios eso significa sesiones
 * "zombis" acumulándose (pestañas olvidadas abiertas, dispositivos
 * compartidos) sin ninguna forma de que expiren solas. 30 min sin actividad
 * (clic, tecla, scroll) cierra la sesión y manda a /login.
 *
 * Se guarda en localStorage (no sólo en memoria) para que abrir una pestaña
 * vieja después de mucho tiempo también cuente como "inactivo", y para que
 * la actividad en una pestaña reinicie el reloj de las demás.
 */
const IDLE_LIMIT_MS = 30 * 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 1000;
const STORAGE_KEY = 'icm:lastActivityAt';
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;

export function IdleSessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const loggingOutRef = useRef(false);

  useEffect(() => {
    if (pathname === ROUTES.login) return;

    const markActive = () => {
      try {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch {
        // Almacenamiento no disponible (modo privado, cuota llena): la
        // expiración por inactividad simplemente no aplica en ese caso.
      }
    };
    markActive();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, markActive, { passive: true }));

    const expireIfIdle = async () => {
      if (loggingOutRef.current) return;
      let lastActive: number;
      try {
        lastActive = Number(localStorage.getItem(STORAGE_KEY) ?? Date.now());
      } catch {
        return;
      }
      if (Date.now() - lastActive < IDLE_LIMIT_MS) return;

      loggingOutRef.current = true;
      if (IS_DEMO_MODE) {
        await fetch('/api/demo-auth/logout', { method: 'POST' }).catch(() => undefined);
      } else {
        await getSupabaseBrowserClient()?.auth.signOut();
      }
      router.push(`${ROUTES.login}?expired=1`);
      router.refresh();
    };

    const interval = window.setInterval(expireIfIdle, CHECK_INTERVAL_MS);
    return () => {
      window.clearInterval(interval);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, markActive));
    };
  }, [pathname, router]);

  return null;
}
