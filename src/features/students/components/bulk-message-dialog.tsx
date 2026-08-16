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

export interface BulkMessageDialogProps {
  open: boolean;
  studentNames: string[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: MessageStudentValues) => Promise<void> | void;
  pending?: boolean;
}

/**
 * A diferencia de `MessageStudentDialog`, no muestra historial — no hay un
 * hilo único que mostrar cuando el destinatario es un grupo. `onSubmit`
 * manda el mismo texto a cada estudiante seleccionado (uno por uno, no hay
 * endpoint de mensajería masiva); este diálogo sólo junta el texto una vez.
 */
export function BulkMessageDialog({
  open,
  studentNames,
  onOpenChange,
  onSubmit,
  pending,
}: BulkMessageDialogProps) {
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
      form.reset({ body: '' });
    } catch {
      // El error ya se muestra vía toast.
    }
  });

  const preview = studentNames.length > 3
    ? `${studentNames.slice(0, 3).join(', ')} y ${studentNames.length - 3} más`
    : studentNames.join(', ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={460}>
        <DialogTitle>Mensaje a {studentNames.length} estudiantes</DialogTitle>
        <DialogDescription>Para: {preview}</DialogDescription>

        <form onSubmit={submit} noValidate>
          <Field label="Mensaje" error={form.formState.errors.body?.message} className="mt-4">
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                {...form.register('body')}
                placeholder="Escribe el mensaje que van a recibir todos…"
                autoFocus
              />
            )}
          </Field>

          <DialogFooter>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="md" className="font-extrabold" disabled={pending}>
              {pending ? 'Enviando…' : `Enviar a ${studentNames.length}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
