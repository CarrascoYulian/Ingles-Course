'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { QUERY_KEYS } from '@/constants';
import { backend } from '@/services';
import type { CreateModuleInput } from '@/services';

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
 * Progreso real del alumno autenticado (porcentaje del curso, nivel, horas,
 * lecciones e insignias). Antes de existir esto, "Mi curso" mostraba estos
 * cinco números escritos a mano en el componente — el mismo valor para
 * cualquier estudiante, sin importar su avance real.
 */
export function useMyProgress() {
  return useQuery({
    queryKey: ['my-progress'],
    queryFn: () => backend.learning.getMyProgress(),
  });
}

/**
 * Guarda el avance de reproducción. Sin toast ni reintento: es un efecto de
 * fondo que el alumno nunca debería notar. Si falla, el progreso local se
 * mantiene y el siguiente latido lo vuelve a intentar.
 */
/**
 * Crea el módulo desde el panel de admin — antes la única vía era escribir
 * el INSERT a mano en el SQL Editor de Supabase, algo que un docente sin
 * conocimientos técnicos no puede hacer.
 */
export function useCreateModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateModuleInput) => backend.learning.createModule(input),
    onSuccess: (module) => {
      queryClient.invalidateQueries({ queryKey: ['current-module'] });
      toast(`“${module.title}” creado`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'No se pudo crear el módulo.'),
  });
}

export function useSaveWatchedPercent() {
  return useMutation({
    mutationFn: ({ lessonId, percent }: { lessonId: string; percent: number }) =>
      backend.learning.saveWatchedPercent(lessonId, percent),
    onError: () => undefined,
  });
}
