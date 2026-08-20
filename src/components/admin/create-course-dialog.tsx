'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useEffect } from 'react';

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
import { createCourseSchema, type CreateCourseValues } from '@/features/courses/schemas';
import { CEFR_LEVELS } from '@/types';

export interface CreateCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateCourseValues) => Promise<void> | void;
  pending?: boolean;
}

export function CreateCourseDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: CreateCourseDialogProps) {
  const form = useForm<CreateCourseValues>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: { name: '', level: 'A1' },
    mode: 'onSubmit',
  });

  // Reabrir el diálogo debe ofrecer un formulario limpio, no el intento anterior.
  useEffect(() => {
    if (open) form.reset({ name: '', level: 'A1' });
  }, [open, form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch {
      // El error ya se muestra vía toast (onError de la mutación que llama
      // este formulario). Sin este catch, el rechazo de `mutateAsync` sube
      // sin capturar y Next lo trata como un crash de runtime en vez de un
      // simple error de envío — el diálogo debe quedarse abierto para
      // reintentar, no tumbar la página.
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={460}>
        <DialogTitle>Crear un curso nuevo</DialogTitle>
        <DialogDescription>
          Se guardará como borrador; podrás publicarlo cuando tenga módulos.
        </DialogDescription>

        <form onSubmit={submit} noValidate>
          <Field
            label="Nombre del curso"
            error={form.formState.errors.name?.message}
            className="mt-5"
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                {...form.register('name')}
                placeholder="Ej. Inglés para entrevistas de trabajo"
                autoComplete="off"
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
                  {CEFR_LEVELS.map((level) => (
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

          <DialogFooter>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="md" className="font-extrabold" disabled={pending}>
              {pending ? 'Creando…' : 'Crear borrador'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
