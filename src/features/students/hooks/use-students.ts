'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

/** Antes no había forma de ver los mensajes ya enviados a un estudiante. */
export function useStudentMessages(studentId: string | null) {
  return useQuery({
    queryKey: ['student-messages', studentId],
    queryFn: async (): Promise<StudentMessage[]> => {
      const response = await fetch(`/api/students/message?studentId=${studentId}`);
      if (!response.ok) throw new Error('No se pudo cargar el historial');
      return response.json();
    },
    enabled: studentId !== null,
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
