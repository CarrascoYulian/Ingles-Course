'use client';

import { useCallback, useState } from 'react';

export interface ConfirmRequest {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
}

/**
 * Estado de un diálogo de confirmación reutilizable. Evita repetir en cada
 * pantalla el trío `open` / `target` / `action` que tenía el prototipo.
 */
export function useConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [pending, setPending] = useState(false);

  const confirm = useCallback((next: ConfirmRequest) => setRequest(next), []);
  const dismiss = useCallback(() => setRequest(null), []);

  const accept = useCallback(async () => {
    if (!request) return;
    setPending(true);
    try {
      await request.onConfirm();
      setRequest(null);
    } finally {
      setPending(false);
    }
  }, [request]);

  return { request, isOpen: request !== null, pending, confirm, dismiss, accept };
}
