'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const newThreadSchema = z.object({
  title: z.string().trim().min(1, 'Escribe un título').max(140, 'Máximo 140 caracteres'),
  body: z.string().trim().min(1, 'Escribe tu pregunta').max(2000, 'Máximo 2000 caracteres'),
});

export type NewThreadValues = z.infer<typeof newThreadSchema>;

export interface NewThreadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: NewThreadValues) => Promise<void> | void;
  pending?: boolean;
}

export function NewThreadDialog({ open, onOpenChange, onSubmit, pending }: NewThreadDialogProps) {
  const form = useForm<NewThreadValues>({
    resolver: zodResolver(newThreadSchema),
    defaultValues: { title: '', body: '' },
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (open) form.reset({ title: '', body: '' });
  }, [open, form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch {
      // El error ya se muestra vía toast (onError de useCreateCourseThread).
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={460}>
        <DialogTitle>Nuevo tema</DialogTitle>

        <form onSubmit={submit} noValidate className="mt-4 flex flex-col gap-3.5">
          <Field label="Título" error={form.formState.errors.title?.message}>
            {(fieldProps) => (
              <Input {...fieldProps} {...form.register('title')} placeholder="¿De qué se trata?" autoFocus />
            )}
          </Field>

          <Field label="Tu pregunta" error={form.formState.errors.body?.message}>
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                {...form.register('body')}
                placeholder="Escribe los detalles…"
              />
            )}
          </Field>

          <DialogFooter>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="md" className="font-extrabold" disabled={pending}>
              {pending ? 'Publicando…' : 'Publicar tema'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
