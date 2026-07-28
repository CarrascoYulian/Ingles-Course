'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { messageStudentSchema, type MessageStudentValues } from '../schemas';

export interface MessageStudentDialogProps {
  open: boolean;
  studentName: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: MessageStudentValues) => Promise<void> | void;
  pending?: boolean;
}

/**
 * Antes, "Enviar mensaje" mandaba siempre el mismo texto fijo
 * ("Mensaje desde el panel docente") sin que el docente escribiera nada.
 * Este diálogo pide el mensaje real.
 */
export function MessageStudentDialog({
  open,
  studentName,
  onOpenChange,
  onSubmit,
  pending,
}: MessageStudentDialogProps) {
  const form = useForm<MessageStudentValues>({
    resolver: zodResolver(messageStudentSchema),
    defaultValues: { body: '' },
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (open) form.reset({ body: '' });
  }, [open, form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch {
      // El error ya se muestra vía toast (onError de useSendStudentMessage).
      // El diálogo se queda abierto para reintentar, en vez de dejar que el
      // rechazo suba sin capturar y tumbe la página.
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={460}>
        <DialogTitle>Enviar mensaje</DialogTitle>
        {studentName && <DialogDescription>Para {studentName}</DialogDescription>}

        <form onSubmit={submit} noValidate>
          <Field label="Mensaje" error={form.formState.errors.body?.message} className="mt-5">
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                {...form.register('body')}
                placeholder="Escribe el mensaje…"
                autoFocus
              />
            )}
          </Field>

          <DialogFooter>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="md" className="font-extrabold" disabled={pending}>
              {pending ? 'Enviando…' : 'Enviar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
