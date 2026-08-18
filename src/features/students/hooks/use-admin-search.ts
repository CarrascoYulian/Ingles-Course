'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';

import { useSharedSearchQuery } from '@/components/admin/admin-shell';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

/**
 * Búsqueda del panel sincronizada con la URL.
 *
 * El texto en vivo (`query`) vive en un contexto compartido a nivel de
 * `AdminShell` (`useSharedSearchQuery`) — no en un `useState` propio de este
 * hook — porque tanto `AdminTopbar` como la vista de cada sección llaman a
 * `useAdminSearch()` por su cuenta; con `useState` local cada uno tenía su
 * propia copia de `query`, y sólo se reconciliaban de vuelta a través de la
 * URL, con el mismo retraso del debounce que se quería evitar. Compartiendo
 * la misma instancia, el filtro instantáneo del listado ve cada tecla al
 * mismo tiempo que el input. La URL se actualiza con retardo y con
 * `replace` para no llenar el historial de entradas intermedias — eso sigue
 * igual, sólo cambia dónde vive `query`.
 */
export function useAdminSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';

  const [query, setQuery] = useSharedSearchQuery();
  const debounced = useDebouncedValue(query, 250);

  // Navegación externa (atrás/adelante, enlace): la URL manda.
  useEffect(() => setQuery(urlQuery), [urlQuery, setQuery]);

  useEffect(() => {
    if (debounced === urlQuery) return;
    const params = new URLSearchParams(searchParams.toString());
    if (debounced) params.set('q', debounced);
    else params.delete('q');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [debounced, urlQuery, pathname, router, searchParams]);

  const clear = useCallback(() => setQuery(''), [setQuery]);

  return { query, setQuery, clear, appliedQuery: urlQuery };
}
