'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { IdleSessionGuard } from '@/components/shared/idle-session-guard';
import { ThemeProvider } from '@/hooks/use-theme';
import { getQueryClient } from '@/lib/query-client';

/**
 * Proveedor global de cliente de la app (React Query, Guard de sesión, Tema Claro/Oscuro).
 */
export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <IdleSessionGuard />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

