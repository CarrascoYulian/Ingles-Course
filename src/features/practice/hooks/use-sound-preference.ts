'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'practice:soundEnabled';

/** Preferencia de sonido de la práctica, persistida en localStorage. */
export function useSoundPreference() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setEnabled(stored === 'true');
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return { enabled, toggle };
}
