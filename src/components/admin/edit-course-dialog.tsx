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
import { CEFR_LEVELS, type Course } from '@/types';

export interface EditCourseDialogProps {
  course: Course | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateCourseValues) => Promise<void> | void;
  pending?: boolean;
}

/**
 * Antes no existía ninguna forma de corregir el nombre o el nivel de un
 * curso ya creado — la única vía era borrarlo y crearlo de nuevo, perdiendo
 * sus módulos y estudiantes matriculados.
 */
export function EditCourseDialog({ course, onOpenChange, onSubmit, pending }: EditCourseDialogProps) {
  const form = useForm<CreateCourseValues>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: { name: '', level: 'A1' },
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (course) form.reset({ name: course.name, level: course.level });
  }, [course, form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch {
      // El error ya se muestra vía toast — el diálogo se queda abierto para reintentar.
    }
  });

  return (
    <Dialog open={course !== null} onOpenChange={onOpenChange}>
      <DialogContent width={460}>
        <DialogTitle>Editar curso</DialogTitle>
        <DialogDescription>Cambia el nombre o el nivel sin perder unidades ni alumnos.</DialogDescription>

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
              {pending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
