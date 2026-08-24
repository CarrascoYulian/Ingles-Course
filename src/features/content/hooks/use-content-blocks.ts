'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { QUERY_KEYS } from '@/constants';
import { backend } from '@/services';
import type { AttachUploadInput } from '@/services';
import type { BlockType, Lesson } from '@/types';

export function useModules(courseId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.modules(courseId),
    queryFn: () => backend.content.listModules(courseId),
    enabled: courseId !== '',
  });
}

export function useContentBlocks(moduleId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.blocks(moduleId),
    queryFn: () => backend.content.listBlocks(moduleId),
    // Espera a que se resuelva el id real del módulo (`useCurrentModule`)
    // antes de consultar.
    enabled: moduleId !== '',
  });
}

export function useUpdateLesson(moduleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lessonId, title, description }: { lessonId: string; title: string; description: string }) =>
      backend.content.updateLesson(lessonId, { title, description }),
    onSuccess: () => {
      // Un solo `update` en `lessons` (misma fila que ve el editor y el
      // alumno) — hay que refrescar ambas listas, no sólo la caché interna
      // del admin, o cada una se queda mostrando el valor viejo.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.blocks(moduleId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lessons(moduleId) });
      toast('Lección actualizada');
    },
    onError: () => toast.error('No se pudo actualizar la lección.'),
  });
}

export function useAddBlock(moduleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (type: BlockType) => backend.content.addBlock(moduleId, type),
    onSuccess: (block) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.blocks(moduleId) });
      toast(`Bloque de ${block.type.toLowerCase()} añadido al final de la unidad`);
    },
    onError: () => toast.error('No se pudo añadir el bloque.'),
  });
}

/**
 * Reordenar es la acción más repetida del constructor: se aplica de forma
 * optimista para que la fila se mueva sin esperar a la red.
 */
export function useMoveBlock(moduleId: string) {
  const queryClient = useQueryClient();
  const key = QUERY_KEYS.blocks(moduleId);

  return useMutation({
    mutationFn: ({ blockId, direction }: { blockId: string; direction: -1 | 1 }) =>
      backend.content.moveBlock(moduleId, blockId, direction),

    onMutate: async ({ blockId, direction }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Lesson[]>(key);

      queryClient.setQueryData<Lesson[]>(key, (blocks) => {
        if (!blocks) return blocks;
        const from = blocks.findIndex((b) => b.id === blockId);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= blocks.length) return blocks;
        const next = [...blocks];
        [next[from], next[to]] = [next[to]!, next[from]!];
        return next.map((block, index) => ({ ...block, order: index }));
      });

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error('No se pudo reordenar el bloque.');
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

/**
 * Arrastrar una fila a una posición arbitraria (drag-and-drop). No existe
 * un RPC de "mover a la posición N": se reutiliza `moveBlock` (swap
 * atómico con el vecino) caminando paso a paso desde `from` hasta `to` —
 * mismo endpoint que ya usan los botones ↑/↓, sin tocar el backend ni el
 * contrato de `Backend` (que exige implementar cualquier método nuevo en
 * los dos adaptadores, demo y Supabase).
 */
export function useReorderBlock(moduleId: string) {
  const queryClient = useQueryClient();
  const key = QUERY_KEYS.blocks(moduleId);

  return useMutation({
    mutationFn: async ({ blockId, from, to }: { blockId: string; from: number; to: number }) => {
      const direction = to > from ? 1 : -1;
      for (let position = from; position !== to; position += direction) {
        await backend.content.moveBlock(moduleId, blockId, direction);
      }
    },

    onMutate: async ({ from, to }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Lesson[]>(key);

      queryClient.setQueryData<Lesson[]>(key, (blocks) => {
        if (!blocks) return blocks;
        const next = [...blocks];
        const [moved] = next.splice(from, 1);
        if (!moved) return blocks;
        next.splice(to, 0, moved);
        return next.map((block, index) => ({ ...block, order: index }));
      });

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error('No se pudo reordenar el bloque.');
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

/**
 * Registra en la base de datos un archivo que ya terminó de subirse a
 * Storage — es lo que hace que aparezca en la lista sin recargar la página.
 */
export function useAttachUpload(moduleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AttachUploadInput) => backend.content.attachUpload(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.blocks(moduleId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.storageUsage });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lessons(moduleId) });
    },
    onError: () => toast.error('El archivo se subió, pero no se pudo registrar en la base de datos.'),
  });
}

/** Abre el archivo real para confirmar que existe y se puede visualizar. */
export function useOpenFile() {
  return useMutation({
    mutationFn: (mediaKey: string) => backend.content.getFileUrl(mediaKey),
    onSuccess: (url) => {
      if (!url) {
        toast.error('El archivo no existe o ya no está disponible.');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    onError: () => toast.error('No se pudo verificar el archivo.'),
  });
}

/** Igual que `useOpenFile`, pero devuelve la URL en vez de abrir pestaña — la usa el preview inline. */
export function usePreviewFileUrl() {
  return useMutation({
    mutationFn: (mediaKey: string) => backend.content.getFileUrl(mediaKey),
    onError: () => toast.error('No se pudo cargar la vista previa.'),
  });
}

/**
 * URL firmada para la miniatura de un bloque de video en la fila del
 * constructor — a diferencia de `usePreviewFileUrl` (mutación, bajo
 * demanda al hacer clic), ésta es una `query` normal: se dispara sola al
 * mostrar la fila, para poder pintar el primer frame real del video en vez
 * de sólo un ícono. Sólo se pide para bloques de video (`enabled`); un PDF
 * o un audio no tienen frame que mostrar.
 */
export function useBlockThumbnailUrl(mediaKey: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['block-thumbnail', mediaKey],
    queryFn: () => backend.content.getFileUrl(mediaKey!),
    enabled: enabled && mediaKey !== null,
    staleTime: 60 * 60 * 1000,
  });
}

export function useRemoveBlock(moduleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; title: string }) => backend.content.removeBlock(id),
    onSuccess: (_data, { title }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.blocks(moduleId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.storageUsage });
      toast(`“${title}” eliminado`);
    },
    onError: () => toast.error('No se pudo eliminar el bloque.'),
  });
}
