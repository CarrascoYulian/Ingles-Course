'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useDebouncedValue } from '@/hooks/use-debounced-value';

/**
 * Búsqueda del panel sincronizada con la URL.
 *
 * Vivir en el query string (y no en un contexto) hace que el estado sea
 * compartible, recuperable al recargar y navegable con atrás/adelante.
 * El input responde al instante; la URL se actualiza con retardo y con
 * `replace` para no llenar el historial de entradas intermedias.
 */
export function useAdminSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';

  const [query, setQuery] = useState(urlQuery);
  const debounced = useDebouncedValue(query, 250);

  // Navegación externa (atrás/adelante, enlace): la URL manda.
  useEffect(() => setQuery(urlQuery), [urlQuery]);

  useEffect(() => {
    if (debounced === urlQuery) return;
    const params = new URLSearchParams(searchParams.toString());
    if (debounced) params.set('q', debounced);
    else params.delete('q');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [debounced, urlQuery, pathname, router, searchParams]);

  const clear = useCallback(() => setQuery(''), []);

  return { query, setQuery, clear, appliedQuery: urlQuery };
}
