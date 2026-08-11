'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { QUERY_KEYS } from '@/constants';
import { backend } from '@/services';
import type { CreateModuleInput } from '@/services';

/**
 * Cursos en los que está matriculado el alumno autenticado. Antes no existía
 * este concepto: `useCurrentModule` ignoraba el curso por completo y
 * resolvía el primer módulo de TODA la base de datos, sin importar en qué
 * curso(s) estuviera matriculado el alumno.
 */
export function useMyCourses() {
  return useQuery({
    queryKey: ['my-courses'],
    queryFn: () => backend.learning.getMyCourses(),
  });
}

/**
 * Módulo "actual" del alumno dentro de un curso concreto. En demo es
 * siempre el módulo de referencia; con Supabase conectado resuelve el
 * primer módulo real de ESE curso — antes ignoraba el curso y devolvía el
 * primer módulo de toda la base, sin importar la matrícula del alumno.
 */
export function useCurrentModule(courseId: string) {
  return useQuery({
    queryKey: ['current-module', courseId],
    queryFn: () => backend.learning.getCurrentModule(courseId),
    enabled: courseId !== '',
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

/**
 * URL firmada del video real de una lección. Antes el reproductor era
 * puramente simulado (un `setInterval` subiendo un porcentaje inventado):
 * nunca pedía ni reproducía un archivo real, aunque Storage ya soportaba
 * URLs firmadas de reproducción (`/api/media`) para otros usos.
 */
export function useLessonVideoUrl(mediaKey: string | null) {
  return useQuery({
    queryKey: ['lesson-video', mediaKey],
    queryFn: () => backend.learning.getLessonVideoUrl(mediaKey!),
    enabled: mediaKey !== null,
    staleTime: 30 * 60 * 1000,
  });
}

export function useResources() {
  return useQuery({
    queryKey: QUERY_KEYS.resources,
    queryFn: () => backend.learning.listResources(),
    staleTime: 10 * 60 * 1000,
  });
}

/** Abre el archivo real de un recurso — antes "Descargar" sólo mostraba un toast falso. */
export function useOpenResource() {
  return useMutation({
    mutationFn: (mediaKey: string) => backend.content.getFileUrl(mediaKey),
    onSuccess: (url) => {
      if (!url) {
        toast.error('El archivo no existe o ya no está disponible.');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    onError: () => toast.error('No se pudo abrir el archivo.'),
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.modules(module.courseId) });
      toast(`“${module.title}” creado`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'No se pudo crear el módulo.'),
  });
}

/**
 * Guarda el avance de reproducción. Sin toast: es un efecto de fondo que el
 * alumno nunca debería notar. Antes tampoco reintentaba — un fallo de red
 * puntual perdía ese punto de guardado en silencio hasta el siguiente tick;
 * con `retry` React Query reintenta con backoff antes de rendirse.
 */
export function useSaveWatchedPercent() {
  return useMutation({
    mutationFn: ({ lessonId, percent }: { lessonId: string; percent: number }) =>
      backend.learning.saveWatchedPercent(lessonId, percent),
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    // Antes: `() => undefined` — tras agotar los 3 reintentos, el progreso
    // se perdía sin que el alumno se enterara nunca. Un solo toast (con id
    // fijo, así sonner lo reemplaza en vez de apilarlo en cada intento
    // fallido cada 5 s) avisa sin ser intrusivo.
    onError: () =>
      toast.error('No se pudo guardar tu progreso. Revisa tu conexión.', { id: 'save-progress-error' }),
  });
}

/**
 * Antes "Añadir nota" fingía guardar una nota en el minuto actual sin pedir
 * texto y sin que existiera ninguna tabla detrás — nunca se veía nada
 * después. Ahora son notas reales del alumno, ligadas a la lección y al
 * segundo exacto del video.
 */
export function useNotes(lessonId: string) {
  return useQuery({
    queryKey: ['lesson-notes', lessonId],
    queryFn: () => backend.learning.listNotes(lessonId),
    enabled: lessonId !== '',
  });
}

export function useAddNote(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body, timestampSeconds }: { body: string; timestampSeconds: number }) =>
      backend.learning.addNote(lessonId, body, timestampSeconds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-notes', lessonId] });
    },
    onError: () => toast.error('No se pudo guardar la nota.'),
  });
}

/** Mensajes reales del docente al alumno — antes no había ningún lugar para verlos. */
export function useMyMessages() {
  return useQuery({
    queryKey: ['my-messages'],
    queryFn: () => backend.learning.getMyMessages(),
  });
}

export function useMarkMessageRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => backend.learning.markMessageRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-messages'] }),
  });
}

/** Antes la bandeja del alumno era de sólo lectura — no había política RLS ni UI para responder. */
export function useSendMyMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => backend.learning.sendMyMessage(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-messages'] }),
    onError: () => toast.error('No se pudo enviar el mensaje.'),
  });
}
