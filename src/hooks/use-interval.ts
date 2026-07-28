'use client';

import { useEffect, useRef } from 'react';

/**
 * `setInterval` declarativo. El callback se guarda en una ref para que
 * cambiarlo no reinicie el temporizador (el bug clásico de meterlo en las
 * dependencias). `delay = null` lo detiene.
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const saved = useRef(callback);

  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
