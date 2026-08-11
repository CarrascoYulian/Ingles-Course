'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export interface EditLessonValues {
  title: string;
  description: string;
}

export interface EditLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: EditLessonValues | null;
  onSubmit: (values: EditLessonValues) => Promise<unknown>;
  pending?: boolean;
}

/**
 * Antes la pestaña "Descripción" del alumno mostraba siempre el mismo texto
 * fijo sobre Present Perfect, sin importar el video real subido — no había
 * ningún lugar donde el docente pudiera escribir el título o la
 * descripción reales de la lección.
 */
export function EditLessonDialog({ open, onOpenChange, initialValues, onSubmit, pending }: EditLessonDialogProps) {
  const form = useForm<EditLessonValues>({ defaultValues: { title: '', description: '' } });

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
        <DialogTitle>Editar lección</DialogTitle>
        <DialogDescription>El alumno ve esto en la pestaña &ldquo;Descripción&rdquo; del video.</DialogDescription>

        <form onSubmit={submit} noValidate>
          <Field label="Título" className="mt-5">
            {(fieldProps) => <Input {...fieldProps} {...form.register('title', { required: true })} autoFocus />}
          </Field>

          <Field label="Descripción" className="mt-[18px]">
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                {...form.register('description')}
                placeholder="¿Qué aprenderá el alumno en este video?"
                rows={5}
              />
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
