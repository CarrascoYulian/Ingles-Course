'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'practice:soundEnabled';

/** Preferencia de sonido de la práctica, persistida en localStorage. */
export function useSoundPreference() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setEnabled(stored === 'true');
    } catch {
      // Safari en modo privado (o cuota agotada) tira al leer localStorage — se
      // mantiene el valor por defecto en memoria sin persistir la preferencia.
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Igual que arriba: si falla la escritura, el toggle sigue funcionando en memoria.
      }
      return next;
    });
  }, []);

  return { enabled, toggle };
}
