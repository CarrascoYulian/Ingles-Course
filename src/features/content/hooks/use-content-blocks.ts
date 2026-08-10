'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { QUERY_KEYS } from '@/constants';
import { backend } from '@/services';
import type { AttachUploadInput } from '@/services';
import type { BlockType, ContentBlock } from '@/types';

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

export function useAddBlock(moduleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (type: BlockType) => backend.content.addBlock(moduleId, type),
    onSuccess: (block) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.blocks(moduleId) });
      toast(`Bloque de ${block.type.toLowerCase()} añadido al final del módulo`);
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
      const previous = queryClient.getQueryData<ContentBlock[]>(key);

      queryClient.setQueryData<ContentBlock[]>(key, (blocks) => {
        if (!blocks) return blocks;
        const from = blocks.findIndex((b) => b.id === blockId);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= blocks.length) return blocks;
        const next = [...blocks];
        [next[from], next[to]] = [next[to]!, next[from]!];
        return next.map((block, index) => ({ ...block, position: index }));
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

export function useRemoveBlock(moduleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; title: string }) => backend.content.removeBlock(id),
    onSuccess: (_data, { title }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.blocks(moduleId) });
      toast(`“${title}” eliminado`);
    },
    onError: () => toast.error('No se pudo eliminar el bloque.'),
  });
}
