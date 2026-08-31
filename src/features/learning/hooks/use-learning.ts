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
export function useMyProgress(courseId: string) {
  return useQuery({
    queryKey: ['my-progress', courseId],
    queryFn: () => backend.learning.getMyProgress(courseId),
    enabled: courseId !== '',
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
      toast.error(error instanceof Error ? error.message : 'No se pudo crear la unidad.'),
  });
}

/**
 * Guarda el avance de reproducción. Sin toast: es un efecto de fondo que el
 * alumno nunca debería notar. Antes tampoco reintentaba — un fallo de red
 * puntual perdía ese punto de guardado en silencio hasta el siguiente tick;
 * con `retry` React Query reintenta con backoff antes de rendirse.
 */
export function useSaveWatchedPercent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lessonId, percent }: { lessonId: string; percent: number; silent?: boolean }) =>
      backend.learning.saveWatchedPercent(lessonId, percent),
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    // Antes: `() => undefined` — tras agotar los 3 reintentos, el progreso
    // se perdía sin que el alumno se enterara nunca. Un solo toast (con id
    // fijo, así sonner lo reemplaza en vez de apilarlo en cada intento
    // fallido cada 5 s) avisa sin ser intrusivo.
    onError: () =>
      toast.error('No se pudo guardar tu progreso. Revisa tu conexión.', { id: 'save-progress-error' }),
    // El trigger de Postgres recalcula `enrollments.progress` en cuanto se
    // guarda `lesson_progress`, pero eso no avisa a React Query — sin esto,
    // "Tu progreso" (ProgressCard) y el estado done/current de la lista de
    // lecciones se quedaban con el valor de antes de ver el video hasta
    // recargar la página entera.
    //
    // `silent` (usado por el guardado periódico de cada 5 s mientras el
    // video corre, ver `useVideoProgress`) se salta esto a propósito: antes
    // cada tick disparaba un refetch de TODO el progreso, lecciones y cursos
    // del alumno — con varios alumnos viendo video a la vez eso multiplicaba
    // las consultas a Supabase varias veces por segundo y llegó a saturarla
    // lo suficiente para que el middleware (que también consulta Supabase en
    // cada request) superara el timeout de 25 s de Vercel. Los momentos que
    // sí importan para refrescar la UI (pausa, fin de video, salir de la
    // lección) no pasan `silent` y siguen invalidando igual que antes.
    onSuccess: (_data, variables) => {
      if (variables.silent) return;
      queryClient.invalidateQueries({ queryKey: ['my-progress'] });
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      queryClient.invalidateQueries({ queryKey: ['my-courses'] });
    },
  });
}

/**
 * Marca un ítem sin reproductor (PDF/Audio/Ejercicio) como visto en cuanto
 * el alumno llega a él — no hay nada que "reproducir", así que no exige
 * ninguna acción explícita, igual que una lección sin video nunca bloqueaba
 * el avance (`canAdvanceLesson`). Sin toast: es un efecto de fondo.
 */
export function useMarkLessonViewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lessonId: string) => backend.learning.markLessonViewed(lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-progress'] });
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      queryClient.invalidateQueries({ queryKey: ['my-courses'] });
    },
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

/** Cantidad de mensajes del docente que el alumno todavía no ha leído —
 * alimenta la bolita de "Mensajes" en la navegación. */
export function useUnreadMessageCount(enabled = true) {
  return useQuery({
    queryKey: ['my-messages'],
    queryFn: () => backend.learning.getMyMessages(),
    refetchInterval: 20_000,
    enabled,
    select: (messages) => messages.filter((m) => m.fromStaff && !m.readAt).length,
  });
}

/** Campana de notificaciones del alumno — mismo polling de 20s que `useUnreadMessageCount`. */
export function useMyNotifications(enabled = true) {
  return useQuery({
    queryKey: ['my-notifications'],
    queryFn: () => backend.learning.getMyNotifications(),
    refetchInterval: 20_000,
    enabled,
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

/**
 * Comentarios reales de una lección — antes `LessonTabs` mostraba un array
 * de ejemplo hardcodeado que nunca cambiaba. Se usa tanto desde la vista
 * del alumno como desde el panel de moderación del docente en el admin.
 */
export function useComments(lessonId: string) {
  return useQuery({
    queryKey: ['lesson-comments', lessonId],
    queryFn: () => backend.learning.listComments(lessonId),
    enabled: lessonId !== '',
  });
}

export function useAddComment(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body, parentId }: { body: string; parentId?: string }) =>
      backend.learning.addComment(lessonId, body, parentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson-comments', lessonId] }),
    onError: () => toast.error('No se pudo publicar el comentario.'),
  });
}

/** El alumno sólo puede borrar el suyo; el docente, cualquiera — RLS lo hace cumplir del lado del servidor. */
export function useDeleteComment(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => backend.learning.deleteComment(commentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson-comments', lessonId] }),
    onError: () => toast.error('No se pudo borrar el comentario.'),
  });
}

/** `null` = nunca abrió la pestaña de comentarios de esta lección. */
export function useCommentsLastSeen(lessonId: string) {
  return useQuery({
    queryKey: ['lesson-comments-seen', lessonId],
    queryFn: () => backend.learning.getCommentsLastSeen(lessonId),
    enabled: lessonId !== '',
  });
}

/** Se llama al abrir la pestaña "Comentarios" — apaga el aviso de "nuevo". */
export function useMarkCommentsSeen(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => backend.learning.markCommentsSeen(lessonId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson-comments-seen', lessonId] }),
  });
}

/** `null` = el módulo no tiene evaluación. Nunca trae preguntas ni opciones — ver `src/app/api/quizzes`. */
export function useModuleQuiz(moduleId: string) {
  return useQuery({
    queryKey: ['module-quiz', moduleId],
    queryFn: () => backend.learning.getModuleQuiz(moduleId),
    enabled: moduleId !== '',
  });
}

/** Historial de intentos del alumno autenticado en ESE quiz — sólo score/passed, nunca las respuestas. */
export function useMyQuizAttempts(quizId: string) {
  return useQuery({
    queryKey: ['my-quiz-attempts', quizId],
    queryFn: () => backend.learning.listMyQuizAttempts(quizId),
    enabled: quizId !== '',
  });
}

/** Temas del foro DEL CURSO (no de una lección) — espacio de discusión general. */
export function useCourseThreads(courseId: string) {
  return useQuery({
    queryKey: ['course-threads', courseId],
    queryFn: () => backend.learning.listCourseThreads(courseId),
    enabled: courseId !== '',
  });
}

export function useCourseThread(threadId: string) {
  return useQuery({
    queryKey: ['course-thread', threadId],
    queryFn: () => backend.learning.getCourseThread(threadId),
    enabled: threadId !== '',
  });
}

export function useThreadReplies(threadId: string) {
  return useQuery({
    queryKey: ['thread-replies', threadId],
    queryFn: () => backend.learning.listThreadReplies(threadId),
    enabled: threadId !== '',
  });
}

export function useCreateCourseThread(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ title, body }: { title: string; body: string }) =>
      backend.learning.createCourseThread(courseId, title, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course-threads', courseId] }),
    onError: () => toast.error('No se pudo publicar el tema'),
  });
}

export function useAddThreadReply(threadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => backend.learning.addThreadReply(threadId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thread-replies', threadId] });
      queryClient.invalidateQueries({ queryKey: ['course-thread', threadId] });
    },
    onError: () => toast.error('No se pudo publicar la respuesta'),
  });
}

export function useDeleteCourseThread(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => backend.learning.deleteCourseThread(threadId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course-threads', courseId] }),
    onError: () => toast.error('No se pudo borrar el tema'),
  });
}

export function useDeleteThreadReply(threadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (replyId: string) => backend.learning.deleteThreadReply(replyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thread-replies', threadId] });
      queryClient.invalidateQueries({ queryKey: ['course-thread', threadId] });
    },
    onError: () => toast.error('No se pudo borrar la respuesta'),
  });
}

/** `null` = el alumno autenticado todavía no calificó este curso. */
export function useMyCourseRating(courseId: string) {
  return useQuery({
    queryKey: ['my-course-rating', courseId],
    queryFn: () => backend.learning.getMyCourseRating(courseId),
    enabled: courseId !== '',
  });
}

export function useSubmitCourseRating(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stars, review }: { stars: number; review: string }) =>
      backend.learning.submitCourseRating(courseId, stars, review),
    onSuccess: () => {
      toast.success('¡Gracias por tu calificación!');
      queryClient.invalidateQueries({ queryKey: ['my-course-rating', courseId] });
    },
    onError: () => toast.error('No se pudo enviar la calificación'),
  });
}
