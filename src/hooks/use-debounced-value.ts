'use client';

import { useEffect, useState } from 'react';

/**
 * Retrasa la propagación de un valor. Se usa en el buscador para no lanzar
 * una consulta por cada pulsación.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
