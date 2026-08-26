'use client';

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

/**
 * Ventana de gracia antes de que un borrado se ejecute de verdad — Gmail
 * usa ~5s para "archivar"/"eliminar"; acá se usa un poco más porque el
 * dato en juego (una unidad o un curso entero) pesa más que un mail.
 */
const UNDO_WINDOW_MS = 8000;

/**
 * Borrado con ventana de deshacer: la fila desaparece de la lista al
 * instante (como un borrado real), pero la mutación que de verdad borra en
 * Postgres/R2 no se dispara hasta que se cumple la ventana — un toast con
 * botón "Deshacer" puede cancelarla antes de que corra.
 *
 * Antes de esto, borrar un curso/unidad/bloque era irreversible en cuanto
 * se confirmaba el diálogo de "Eliminar definitivamente": no había margen
 * real (el borrado en R2 ya es instantáneo, no queda ni la ventana de
 * facto de 48h que daba el cron de reconciliación). Un solo click de más
 * bastaba para perder el archivo para siempre.
 *
 * `isHidden(id)` se usa para filtrar la fila del render mientras la
 * ventana sigue abierta — sin tocar la caché de TanStack Query ni el
 * estado real del backend hasta que la ventana expira.
 */
export function useUndoableDelete() {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const request = useCallback(
    (id: string, message: string, action: () => Promise<unknown>) => {
      setHiddenIds((prev) => new Set(prev).add(id));

      const timer = setTimeout(() => {
        timers.current.delete(id);
        void action().catch(() => {
          // Si la mutación real falla, la fila tiene que volver a
          // aparecer — si no, queda oculta para siempre sin haberse
          // borrado de verdad.
          setHiddenIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        });
      }, UNDO_WINDOW_MS);
      timers.current.set(id, timer);

      toast(message, {
        duration: UNDO_WINDOW_MS,
        action: {
          label: 'Deshacer',
          onClick: () => {
            const pending = timers.current.get(id);
            if (pending) {
              clearTimeout(pending);
              timers.current.delete(id);
            }
            setHiddenIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          },
        },
      });
    },
    [],
  );

  /**
   * Variante para borrado en lote: un solo toast con "Deshacer" cubre
   * varios ids a la vez — pedir un toast por fila seleccionada sería
   * ruidoso e inútil (nadie va a deshacer uno de diez uno por uno).
   */
  const requestMany = useCallback(
    (ids: string[], message: string, action: (id: string) => Promise<unknown>) => {
      if (ids.length === 0) return;
      setHiddenIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        return next;
      });

      const timer = setTimeout(() => {
        for (const id of ids) timers.current.delete(id);
        void Promise.allSettled(ids.map((id) => action(id))).then((results) => {
          const failedIds = ids.filter((_, i) => results[i]!.status === 'rejected');
          if (failedIds.length === 0) return;
          setHiddenIds((prev) => {
            const next = new Set(prev);
            for (const id of failedIds) next.delete(id);
            return next;
          });
        });
      }, UNDO_WINDOW_MS);
      for (const id of ids) timers.current.set(id, timer);

      toast(message, {
        duration: UNDO_WINDOW_MS,
        action: {
          label: 'Deshacer',
          onClick: () => {
            clearTimeout(timer);
            for (const id of ids) timers.current.delete(id);
            setHiddenIds((prev) => {
              const next = new Set(prev);
              for (const id of ids) next.delete(id);
              return next;
            });
          },
        },
      });
    },
    [],
  );

  const isHidden = useCallback((id: string) => hiddenIds.has(id), [hiddenIds]);

  return { request, requestMany, isHidden };
}
