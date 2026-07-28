'use client';

import { useSyncExternalStore } from 'react';

/**
 * `useSyncExternalStore` en lugar de `useState` + `useEffect`: no hay un
 * primer render con el valor equivocado ni parpadeo al hidratar.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    // En servidor asumimos escritorio: es el layout por defecto del diseño.
    () => false,
  );
}

/** Punto de ruptura donde aparece la barra lateral. */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');

/** Respeta la preferencia del sistema de movimiento reducido. */
export const usePrefersReducedMotion = () =>
  useMediaQuery('(prefers-reduced-motion: reduce)');
