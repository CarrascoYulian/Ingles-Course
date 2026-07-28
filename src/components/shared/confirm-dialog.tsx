'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ConfirmRequest } from '@/hooks/use-confirm-dialog';

export interface ConfirmDialogProps {
  request: ConfirmRequest | null;
  open: boolean;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmación para acciones destructivas.
 *
 * El botón de confirmar no recibe autofoco: si la acción no se puede
 * deshacer, la tecla Intro no debe ejecutarla por inercia. El foco entra en
 * el diálogo (Radix) y el usuario elige explícitamente.
 */
export function ConfirmDialog({
  request,
  open,
  pending,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent width={420} onOpenAutoFocus={(event) => event.preventDefault()}>
        <span
          aria-hidden
          className="grid size-[38px] place-items-center rounded-2xl bg-danger-soft text-title-lg font-extrabold text-danger"
        >
          !
        </span>

        <DialogTitle className="mt-3.5">{request?.title ?? ''}</DialogTitle>
        <DialogDescription>{request?.body ?? ''}</DialogDescription>

        <DialogFooter>
          <Button variant="ghost" size="md" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <Button
            size="md"
            onClick={onConfirm}
            disabled={pending}
            className="bg-danger font-extrabold hover:bg-danger-strong disabled:bg-danger/50 disabled:text-white"
          >
            {pending ? 'Procesando…' : (request?.confirmLabel ?? 'Confirmar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
