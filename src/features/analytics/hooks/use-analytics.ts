'use client';

import { useQuery } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/constants';
import { backend } from '@/services';
import type { ReportRange } from '@/types';

export function useDashboardMetrics() {
  return useQuery({
    queryKey: [...QUERY_KEYS.dashboard, 'metrics'],
    queryFn: () => backend.analytics.getMetrics(),
    staleTime: 4 * 60 * 1000,
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: [...QUERY_KEYS.dashboard, 'activity'],
    queryFn: () => backend.analytics.getActivity(),
    // «En vivo»: la actividad reciente se refresca sola cada minuto.
    refetchInterval: 60 * 1000,
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: [...QUERY_KEYS.dashboard, 'leaderboard'],
    queryFn: () => backend.analytics.getLeaderboard(),
  });
}

export function useReport(range: ReportRange) {
  return useQuery({
    queryKey: QUERY_KEYS.report(range),
    queryFn: () => backend.analytics.getReport(range),
    // Cambiar de rango mantiene las barras anteriores mientras carga: la
    // transición de altura resulta continua en vez de un parpadeo a cero.
    placeholderData: keepPreviousData,
  });
}
