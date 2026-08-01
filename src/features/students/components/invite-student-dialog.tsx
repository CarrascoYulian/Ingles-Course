'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { CEFR_ENROLLMENT_LEVELS, inviteStudentSchema, type InviteStudentValues } from '../schemas';

export interface InviteStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: InviteStudentValues) => Promise<void> | void;
  pending?: boolean;
}

const DEFAULT_VALUES: InviteStudentValues = { fullName: '', level: 'A1', password: '' };

/**
 * El estudiante entra con su matrícula (asignada automáticamente al crear)
 * y la clave que el maestro le pone aquí — no con correo. No se envía
 * ninguna invitación por email.
 */
export function InviteStudentDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: InviteStudentDialogProps) {
  const form = useForm<InviteStudentValues>({
    resolver: zodResolver(inviteStudentSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (open) form.reset(DEFAULT_VALUES);
  }, [open, form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch {
      // El error ya se muestra vía toast (onError de useInviteStudent). El
      // diálogo se queda abierto para reintentar, en vez de dejar que el
      // rechazo suba sin capturar y tumbe la página.
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={420}>
        <DialogTitle>Nuevo estudiante</DialogTitle>
        <DialogDescription>
          La matrícula se genera automáticamente. El alumno entra con esa matrícula y la
          contraseña que le pongas aquí.
        </DialogDescription>

        <form onSubmit={submit} noValidate>
          <Field
            label="Nombre completo"
            error={form.formState.errors.fullName?.message}
            className="mt-5"
          >
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

          <fieldset className="mt-[18px]">
            <legend className="text-meta font-bold text-fg-subtle">Nivel</legend>
            <Controller
              control={form.control}
              name="level"
              render={({ field }) => (
                <div role="radiogroup" aria-label="Nivel" className="mt-2 flex gap-2">
                  {CEFR_ENROLLMENT_LEVELS.map((level) => (
                    <Chip
                      key={level}
                      role="radio"
                      aria-checked={field.value === level}
                      active={field.value === level}
                      onClick={() => field.onChange(level)}
                    >
                      {level}
                    </Chip>
                  ))}
                </div>
              )}
            />
          </fieldset>

          <Field
            label="Contraseña"
            error={form.formState.errors.password?.message}
            className="mt-[18px]"
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                {...form.register('password')}
                type="text"
                placeholder="Mínimo 6 caracteres"
                autoComplete="off"
              />
            )}
          </Field>

          <DialogFooter>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="md" className="font-extrabold" disabled={pending}>
              {pending ? 'Creando…' : 'Crear estudiante'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
