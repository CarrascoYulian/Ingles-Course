'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { QUERY_KEYS } from '@/constants';
import { backend } from '@/services';
import type { CreateAssignmentInput } from '@/services';

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

/** Autoría docente — tabla por alumno de una tarea concreta. */
export function useAssignmentSubmissions(assignmentId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.assignmentSubmissions(assignmentId),
    queryFn: () => backend.assignments.listSubmissionsForAssignment(assignmentId),
    enabled: assignmentId !== '',
  });
}

export function useGradeSubmission(assignmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, grade, feedback }: { submissionId: string; grade: number; feedback: string }) =>
      backend.assignments.gradeSubmission(submissionId, grade, feedback),
    onSuccess: () => {
      toast.success('Calificación guardada');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.assignmentSubmissions(assignmentId) });
    },
    onError: () => toast.error('No se pudo guardar la calificación'),
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
