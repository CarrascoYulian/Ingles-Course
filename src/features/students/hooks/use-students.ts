'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';

import { QUERY_KEYS } from '@/constants';
import { backend } from '@/services';
import type { CreateStudentInput, StudentFilters, UpdateStudentInput } from '@/services';

export interface StudentMessage {
  id: string;
  body: string;
  createdAt: string;
  fromStaff: boolean;
}

interface StudentMessagePage {
  items: StudentMessage[];
  nextCursor: string | null;
}

/**
 * Antes no había forma de ver los mensajes ya enviados a un estudiante, y
 * después el historial se cortaba en seco a 50 sin ningún "cargar más" —
 * una conversación larga perdía contexto sin avisar. Páginas por cursor
 * (`before`), más viejas primero al desplegarse.
 */
export function useStudentMessages(studentId: string | null) {
  return useInfiniteQuery({
    queryKey: ['student-messages', studentId],
    queryFn: async ({ pageParam }): Promise<StudentMessagePage> => {
      const params = new URLSearchParams({ studentId: studentId ?? '' });
      if (pageParam) params.set('before', pageParam);
      const response = await fetch(`/api/students/message?${params}`);
      if (!response.ok) throw new Error('No se pudo cargar el historial');
      return response.json();
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: studentId !== null,
  });
}

/** Total de mensajes de alumnos que el docente todavía no ha leído — para
 * la bolita de notificación en el nav. Se refresca solo cada 20 s: es una
 * cuenta de fondo, no algo por lo que valga la pena pagar un websocket. */
export function useUnreadStaffMessageCount(enabled = true) {
  return useQuery({
    queryKey: ['staff-unread-messages'],
    queryFn: async (): Promise<number> => {
      const response = await fetch('/api/students/message/unread-count');
      if (!response.ok) return 0;
      const { count } = (await response.json()) as { count: number };
      return count;
    },
    refetchInterval: 20_000,
    enabled,
  });
}

/** Marca como leídos (por el docente) los mensajes de un alumno concreto —
 * se llama al abrir su hilo en `MessageStudentDialog`. */
export function useMarkStaffMessagesRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studentId: string) => {
      await fetch('/api/students/message', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-unread-messages'] });
      queryClient.invalidateQueries({ queryKey: ['staff-unread-student-ids'] });
    },
  });
}

/** IDs de alumnos con mensajes sin leer por el docente — para la bolita
 * sobre el nombre de cada fila/ficha en "Estudiantes". */
export function useUnreadStudentIds(enabled = true) {
  return useQuery({
    queryKey: ['staff-unread-student-ids'],
    queryFn: async (): Promise<string[]> => {
      const response = await fetch('/api/students/message/unread-by-student');
      if (!response.ok) return [];
      const { studentIds } = (await response.json()) as { studentIds: string[] };
      return studentIds;
    },
    refetchInterval: 20_000,
    enabled,
  });
}

export function useStudents(filters: StudentFilters) {
  return useQuery({
    queryKey: QUERY_KEYS.students(filters),
    queryFn: () => backend.students.list(filters),
    // Al teclear en el buscador la lista anterior permanece visible en lugar
    // de vaciarse: evita el salto de layout entre resultados.
    placeholderData: keepPreviousData,
  });
}

export function useResetStudentProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; name: string }) => backend.students.resetProgress(id),
    onSuccess: (_data, { name }) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast(`Progreso de ${name} reiniciado`);
    },
    onError: () => toast.error('No se pudo reiniciar el progreso.'),
  });
}

export function useSendStudentMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; name: string; body: string }) =>
      backend.students.sendMessage(id, body),
    onSuccess: (_data, { id, name }) => {
      queryClient.invalidateQueries({ queryKey: ['student-messages', id] });
      toast(`Mensaje enviado a ${name}`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'No se pudo enviar el mensaje.'),
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStudentInput }) =>
      backend.students.update(id, input),
    onSuccess: (student) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast(`Datos de ${student.name} actualizados`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el estudiante.'),
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; name: string }) => backend.students.remove(id),
    onSuccess: (_data, { name }) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast(`${name} eliminado`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el estudiante.'),
  });
}

/** Pausa/reactiva al alumno — mientras está inactivo no puede iniciar sesión. */
export function useToggleStudentActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, active }: { id: string; name: string; active: boolean }) =>
      backend.students.setActive(id, active),
    onSuccess: (_data, { name, active }) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast(active ? `${name} activado` : `${name} desactivado`);
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : 'No se pudo cambiar el estado del estudiante.',
      ),
  });
}

export function useEnrollStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, courseId }: { id: string; name: string; courseId: string }) =>
      backend.students.enroll(id, courseId),
    onSuccess: (_data, { name }) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast(`${name} matriculado`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'No se pudo matricular al estudiante.'),
  });
}

export function useInviteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateStudentInput) => backend.students.invite(input),
    onSuccess: () => {
      // El diálogo ya muestra la matrícula en un recuadro copiable; el toast
      // sólo confirmaba lo mismo un instante y desaparecía.
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'No se pudo crear el estudiante.'),
  });
}
