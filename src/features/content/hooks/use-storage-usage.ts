'use client';

import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/constants';
import { backend } from '@/services';

/** Uso real del bucket — issue #39. Se invalida al subir/borrar archivos (ver `use-content-blocks.ts`). */
export function useStorageUsage() {
  return useQuery({
    queryKey: QUERY_KEYS.storageUsage,
    queryFn: () => backend.storage.getUsage(),
    staleTime: 60_000,
  });
}
