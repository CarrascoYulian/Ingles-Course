'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export interface EditModuleValues {
  title: string;
}

export interface EditModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: EditModuleValues | null;
  onSubmit: (values: EditModuleValues) => Promise<unknown>;
  pending?: boolean;
}

/**
 * Antes `createModule` era la única operación disponible sobre una unidad —
 * un docente que se equivocaba de título tenía que borrar y recrearla desde
 * cero (perdiendo el orden relativo con las demás).
 */
export function EditModuleDialog({ open, onOpenChange, initialValues, onSubmit, pending }: EditModuleDialogProps) {
  const form = useForm<EditModuleValues>({ defaultValues: { title: '' } });

  useEffect(() => {
    if (open && initialValues) form.reset(initialValues);
  }, [open, initialValues, form]);

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    onOpenChange(false);
  });

  if (!initialValues) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={460}>
        <DialogTitle>Renombrar unidad</DialogTitle>
        <DialogDescription>El alumno ve este título en el índice del curso.</DialogDescription>

        <form onSubmit={submit} noValidate>
          <Field label="Título de la unidad" className="mt-5">
            {(fieldProps) => (
              <Input {...fieldProps} {...form.register('title', { required: true })} autoFocus />
            )}
          </Field>

          <DialogFooter>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="md" className="font-extrabold" disabled={pending}>
              {pending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
