'use client';

import { useQuery } from '@tanstack/react-query';

import { backend } from '@/services';

export function useAuditLog(page: number) {
  return useQuery({
    queryKey: ['audit-log', page],
    queryFn: () => backend.audit.list(page),
  });
}
