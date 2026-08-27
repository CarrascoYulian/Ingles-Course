'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
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
import { inviteStaffSchema, type InviteStaffValues } from '../schemas';

export interface InviteStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: InviteStaffValues) => Promise<{ email: string }>;
  pending?: boolean;
}

const DEFAULT_VALUES: InviteStaffValues = { fullName: '', email: '' };

/**
 * A diferencia de un estudiante (matrícula + PIN, sin correo real), un
 * admin sí recibe una invitación por email real de Supabase con un link
 * para elegir su propia contraseña — por eso el diálogo no muestra
 * credenciales, sólo confirma que el correo salió.
 */
export function InviteStaffDialog({ open, onOpenChange, onSubmit, pending }: InviteStaffDialogProps) {
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<InviteStaffValues>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (open) {
      form.reset(DEFAULT_VALUES);
      setSentTo(null);
    }
  }, [open, form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      const { email } = await onSubmit(values);
      setSentTo(email);
    } catch {
      // El error ya se muestra vía toast (onError de useInviteStaff).
    }
  });

  if (sentTo) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent width={420}>
          <DialogTitle>Invitación enviada</DialogTitle>
          <DialogDescription>
            Le mandamos un correo a <strong className="text-fg">{sentTo}</strong> con un link para
            que elija su propia contraseña y entre al panel.
          </DialogDescription>
          <DialogFooter>
            <Button size="md" className="font-extrabold" onClick={() => onOpenChange(false)}>
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={420}>
        <DialogTitle>Invitar administrador</DialogTitle>
        <DialogDescription>
          Le llega un correo con un link para elegir su contraseña y entrar al panel.
        </DialogDescription>

        <form onSubmit={submit} noValidate>
          <Field label="Nombre completo" error={form.formState.errors.fullName?.message} className="mt-5">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                {...form.register('fullName')}
                placeholder="Nombre y apellido"
                autoComplete="off"
                autoFocus
              />
            )}
          </Field>

          <Field label="Correo" error={form.formState.errors.email?.message} className="mt-[18px]">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                {...form.register('email')}
                type="email"
                placeholder="nombre@correo.com"
                autoComplete="off"
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
