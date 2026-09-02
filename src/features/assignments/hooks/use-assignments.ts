'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { QUERY_KEYS } from '@/constants';
import { backend } from '@/services';
import type { CreateAssignmentInput } from '@/services';
import type { Assignment } from '@/types';

/** Autoría docente — lista de tareas del módulo. */
export function useAssignments(moduleId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.assignments(moduleId),
    queryFn: () => backend.assignments.listAssignments(moduleId),
    enabled: moduleId !== '',
  });
}

export function useCreateAssignment(moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssignmentInput) => backend.assignments.createAssignment(input),
    onSuccess: () => {
      toast.success('Tarea creada');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.assignments(moduleId) });
    },
    onError: () => toast.error('No se pudo crear la tarea'),
  });
}

export function useUpdateAssignment(moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Omit<CreateAssignmentInput, 'moduleId'> }) =>
      backend.assignments.updateAssignment(id, input),
    onSuccess: () => {
      toast.success('Tarea actualizada');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.assignments(moduleId) });
    },
    onError: () => toast.error('No se pudo actualizar la tarea'),
  });
}

export function useRemoveAssignment(moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.assignments.removeAssignment(id),
    onSuccess: () => {
      toast.success('Tarea eliminada');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.assignments(moduleId) });
    },
    onError: () => toast.error('No se pudo eliminar la tarea'),
  });
}

export function useMoveAssignment(moduleId: string) {
  const queryClient = useQueryClient();
  const key = QUERY_KEYS.assignments(moduleId);

  return useMutation({
    mutationFn: ({ assignmentId, direction }: { assignmentId: string; direction: -1 | 1 }) =>
      backend.assignments.moveAssignment(moduleId, assignmentId, direction),

    onMutate: async ({ assignmentId, direction }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Assignment[]>(key);

      queryClient.setQueryData<Assignment[]>(key, (assignments) => {
        if (!assignments) return assignments;
        const from = assignments.findIndex((a) => a.id === assignmentId);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= assignments.length) return assignments;
        const next = [...assignments];
        [next[from], next[to]] = [next[to]!, next[from]!];
        return next.map((assignment, index) => ({ ...assignment, order: index }));
      });

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error('No se pudo reordenar la tarea.');
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

/**
 * Arrastrar una fila a una posición arbitraria (drag-and-drop). Mismo
 * patrón que `useReorderBlock`: no hay RPC de "mover a la posición N", se
 * camina paso a paso con el swap atómico (`moveAssignment`) desde `from`
 * hasta `to`.
 */
export function useReorderAssignment(moduleId: string) {
  const queryClient = useQueryClient();
  const key = QUERY_KEYS.assignments(moduleId);

  return useMutation({
    mutationFn: async ({ assignmentId, from, to }: { assignmentId: string; from: number; to: number }) => {
      const direction = to > from ? 1 : -1;
      for (let position = from; position !== to; position += direction) {
        await backend.assignments.moveAssignment(moduleId, assignmentId, direction);
      }
    },

    onMutate: async ({ from, to }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Assignment[]>(key);

      queryClient.setQueryData<Assignment[]>(key, (assignments) => {
        if (!assignments) return assignments;
        const next = [...assignments];
        const [moved] = next.splice(from, 1);
        if (!moved) return assignments;
        next.splice(to, 0, moved);
        return next.map((assignment, index) => ({ ...assignment, order: index }));
      });

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error('No se pudo reordenar la tarea.');
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

/**
 * Autoría docente — TODAS las entregas de TODAS las tareas del módulo, en
 * una sola consulta. La vista filtra client-side por `assignmentId` para
 * que los contadores de cada fila sean siempre correctos, no sólo los de
 * la tarea que esté expandida.
 */
export function useModuleSubmissions(moduleId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.moduleSubmissions(moduleId),
    queryFn: () => backend.assignments.listSubmissionsForModule(moduleId),
    enabled: moduleId !== '',
  });
}

export function useGradeSubmission(moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, grade, feedback }: { submissionId: string; grade: number; feedback: string }) =>
      backend.assignments.gradeSubmission(submissionId, grade, feedback),
    onSuccess: () => {
      toast.success('Calificación guardada');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.moduleSubmissions(moduleId) });
    },
    onError: () => toast.error('No se pudo guardar la calificación'),
  });
}

/**
 * Cuenta global de entregas sin calificar, de todos los módulos — para la
 * campana de notificaciones. Incluye `target` (curso + módulo de la entrega
 * más antigua sin calificar) para que la notificación pueda navegar ahí.
 */
export function useUngradedCount(enabled = true) {
  return useQuery({
    queryKey: ['assignments-ungraded-count'],
    queryFn: () => backend.assignments.getUngradedCount(),
    refetchInterval: 20_000,
    enabled,
  });
}

/** Lado alumno — tareas de todos los módulos con acceso en ese curso. */
export function useMyAssignments(courseId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.myAssignments(courseId),
    queryFn: () => backend.learning.listMyAssignments(courseId),
    enabled: courseId !== '',
  });
}

export function useMySubmission(assignmentId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.mySubmission(assignmentId),
    queryFn: () => backend.learning.getMySubmission(assignmentId),
    enabled: assignmentId !== '',
  });
}

export function useSubmitAssignment(assignmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { kind: 'file' | 'audio'; mediaKey: string; fileName: string }) =>
      backend.learning.submitAssignment(assignmentId, input),
    onSuccess: () => {
      toast.success('Tarea entregada');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mySubmission(assignmentId) });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo entregar la tarea'),
  });
}

export function useDeleteMySubmission(assignmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (submissionId: string) => backend.learning.deleteMySubmission(submissionId),
    onSuccess: () => {
      toast('Entrega borrada — ya podés volver a subir');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mySubmission(assignmentId) });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo borrar la entrega'),
  });
}
