'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';

import { QUERY_KEYS } from '@/constants';
import { backend } from '@/services';
import type { CreateStudentInput, StudentFilters } from '@/services';

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
  return useMutation({
    mutationFn: ({ id, body }: { id: string; name: string; body: string }) =>
      backend.students.sendMessage(id, body),
    onSuccess: (_data, { name }) => toast(`Mensaje enviado a ${name}`),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'No se pudo enviar el mensaje.'),
  });
}

export function useInviteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateStudentInput) => backend.students.invite(input),
    onSuccess: ({ enrollmentCode }) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast(`Estudiante creado · matrícula ${enrollmentCode}`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'No se pudo crear el estudiante.'),
  });
}
