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
import { Input } from '@/components/ui/input';
import { inviteStudentSchema, type InviteStudentValues } from '../schemas';

export interface InviteStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: InviteStudentValues) => Promise<void> | void;
  pending?: boolean;
}

/**
 * Antes, el botón "Invitar estudiante" enviaba siempre el mismo correo de
 * relleno (`nuevo@estudiante.do`) sin preguntar nada — de ahí que la
 * invitación fallara en cuanto Supabase intentaba reenviarla. Este diálogo
 * pide el correo real antes de invitar.
 */
export function InviteStudentDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: InviteStudentDialogProps) {
  const form = useForm<InviteStudentValues>({
    resolver: zodResolver(inviteStudentSchema),
    defaultValues: { email: '' },
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (open) form.reset({ email: '' });
  }, [open, form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch {
      // El error ya se muestra vía toast (onError de useInviteStudent). El
      // diálogo se queda abierto para reintentar con otro correo, en vez de
      // dejar que el rechazo suba sin capturar y tumbe la página.
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={420}>
        <DialogTitle>Invitar estudiante</DialogTitle>
        <DialogDescription>
          Le llegará un correo para crear su contraseña. La matrícula se genera automáticamente.
        </DialogDescription>

        <form onSubmit={submit} noValidate>
          <Field label="Correo del estudiante" error={form.formState.errors.email?.message} className="mt-5">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                {...form.register('email')}
                type="email"
                placeholder="estudiante@correo.com"
                autoComplete="off"
                autoFocus
              />
            )}
          </Field>

          <DialogFooter>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="md" className="font-extrabold" disabled={pending}>
              {pending ? 'Enviando…' : 'Enviar invitación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
