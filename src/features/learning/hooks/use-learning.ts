'use client';

import { useMutation, useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/constants';
import { backend } from '@/services';

/**
 * Módulo "actual" del alumno. En demo es siempre el módulo de referencia;
 * con Supabase conectado resuelve el primer módulo real de la base de
 * datos — evita hardcodear un id de módulo que sólo existe en memoria.
 */
export function useCurrentModule() {
  return useQuery({
    queryKey: ['current-module'],
    queryFn: () => backend.learning.getCurrentModule(),
  });
}

export function useModuleLessons(moduleId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.lessons(moduleId),
    queryFn: () => backend.learning.listLessons(moduleId),
    // Espera a que `useCurrentModule` resuelva un id real antes de
    // consultar — evita un viaje de red con un moduleId vacío.
    enabled: moduleId !== '',
  });
}

export function useResources() {
  return useQuery({
    queryKey: QUERY_KEYS.resources,
    queryFn: () => backend.learning.listResources(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useBadges() {
  return useQuery({
    queryKey: QUERY_KEYS.badges,
    queryFn: () => backend.learning.listBadges(),
  });
}

/**
 * Guarda el avance de reproducción. Sin toast ni reintento: es un efecto de
 * fondo que el alumno nunca debería notar. Si falla, el progreso local se
 * mantiene y el siguiente latido lo vuelve a intentar.
 */
export function useSaveWatchedPercent() {
  return useMutation({
    mutationFn: ({ lessonId, percent }: { lessonId: string; percent: number }) =>
      backend.learning.saveWatchedPercent(lessonId, percent),
    onError: () => undefined,
  });
}
