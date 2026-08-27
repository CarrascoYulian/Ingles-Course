'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { QUERY_KEYS } from '@/constants';
import { backend } from '@/services';
import type { CreateCourseInput } from '@/services';
import type { Course } from '@/types';

export function useCourses() {
  return useQuery({
    queryKey: QUERY_KEYS.courses,
    queryFn: () => backend.courses.list(),
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCourseInput) => backend.courses.create(input),
    onSuccess: (course) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.courses });
      toast(`“${course.name}” creado como borrador`);
    },
    onError: () => toast.error('No se pudo crear el curso. Inténtalo de nuevo.'),
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateCourseInput }) =>
      backend.courses.update(id, input),
    onSuccess: (course) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.courses });
      toast(`“${course.name}” actualizado`);
    },
    onError: () => toast.error('No se pudo actualizar el curso. Inténtalo de nuevo.'),
  });
}

/**
 * Publicar/ocultar es una acción de un clic sobre una lista visible: se
 * aplica de forma optimista para que la píldora cambie en el mismo
 * fotograma. Si el servidor falla, se restaura la instantánea previa.
 */
export function useTogglePublished() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      backend.courses.setPublished(id, published),

    onMutate: async ({ id, published }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.courses });
      const previous = queryClient.getQueryData<Course[]>(QUERY_KEYS.courses);
      queryClient.setQueryData<Course[]>(QUERY_KEYS.courses, (courses) =>
        courses?.map((course) => (course.id === id ? { ...course, published } : course)),
      );
      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEYS.courses, context.previous);
      toast.error('No se pudo cambiar la visibilidad del curso.');
    },

    onSuccess: (course) => {
      toast(
        course.published
          ? `“${course.name}” publicado`
          : `“${course.name}” oculto para los estudiantes`,
      );
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.courses }),
  });
}

/** Estado intermedio antes de borrar — un curso archivado deja de ser visible para alumnos, sin importar `published`. */
export function useToggleArchived() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      backend.courses.setArchived(id, archived),

    onMutate: async ({ id, archived }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.courses });
      const previous = queryClient.getQueryData<Course[]>(QUERY_KEYS.courses);
      queryClient.setQueryData<Course[]>(QUERY_KEYS.courses, (courses) =>
        courses?.map((course) => (course.id === id ? { ...course, archived } : course)),
      );
      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEYS.courses, context.previous);
      toast.error('No se pudo archivar el curso.');
    },

    onSuccess: (course) => {
      toast(course.archived ? `“${course.name}” archivado` : `“${course.name}” restaurado del archivo`);
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.courses }),
  });
}

/**
 * Consulta bajo demanda (no una `query` normal: sólo se necesita en el
 * instante de publicar) qué unidades del curso quedarían vacías o sin
 * evaluación si se publica ahora — para advertir, no para bloquear.
 */
export function usePublishWarnings() {
  return useMutation({
    mutationFn: (courseId: string) => backend.courses.getPublishWarnings(courseId),
  });
}

export function useReorderCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: -1 | 1 }) =>
      backend.courses.reorder(id, direction),
    onSuccess: (courses) => queryClient.setQueryData(QUERY_KEYS.courses, courses),
    onError: () => toast.error('No se pudo reordenar el curso.'),
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; name: string }) => backend.courses.remove(id),
    onSuccess: (_data, { name }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.courses });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.storageUsage });
      toast(`“${name}” eliminado`);
    },
    onError: () => toast.error('No se pudo eliminar el curso.'),
  });
}
