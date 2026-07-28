'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { getQueryClient } from '@/lib/query-client';

/**
 * Único proveedor de cliente de la app. Se mantiene mínimo a propósito:
 * cuanto más alto está un provider, más árbol obliga a renderizar en cliente.
 */
export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
