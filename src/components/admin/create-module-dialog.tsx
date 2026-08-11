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
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useCourses } from '@/features/courses/hooks/use-courses';
import { createModuleSchema, type CreateModuleValues } from '@/features/learning/schemas';

export interface CreateModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateModuleValues) => Promise<void> | void;
  pending?: boolean;
  /** Si se pasa, el curso queda fijo (se omite el selector de curso). */
  courseId?: string;
}

export function CreateModuleDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
  courseId: fixedCourseId,
}: CreateModuleDialogProps) {
  const { data: courses } = useCourses();

  const form = useForm<CreateModuleValues>({
    resolver: zodResolver(createModuleSchema),
    defaultValues: { courseId: fixedCourseId ?? '', title: '' },
    mode: 'onSubmit',
  });

  // Reabrir el diálogo debe ofrecer un formulario limpio, no el intento anterior.
  useEffect(() => {
    if (open) form.reset({ courseId: fixedCourseId ?? courses?.[0]?.id ?? '', title: '' });
  }, [open, courses, fixedCourseId, form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch {
      // El error ya se muestra vía toast (onError de la mutación que llama
      // este formulario) — el diálogo se queda abierto para reintentar.
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={460}>
        <DialogTitle>Crear un módulo</DialogTitle>
        <DialogDescription>
          El módulo se crea vacío; luego podrás añadirle bloques desde este mismo panel.
        </DialogDescription>

        {!fixedCourseId && courses && courses.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              compact
              title="Primero crea un curso"
              description="Un módulo siempre pertenece a un curso — crea el curso desde la sección “Cursos” antes de continuar."
            />
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            {!fixedCourseId && (
              <fieldset className="mt-5">
                <legend className="text-meta font-bold text-fg-subtle">Curso</legend>
                <Controller
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <div role="radiogroup" aria-label="Curso" className="mt-2 flex flex-wrap gap-2">
                      {courses?.map((course) => (
                        <Chip
                          key={course.id}
                          role="radio"
                          aria-checked={field.value === course.id}
                          active={field.value === course.id}
                          onClick={() => field.onChange(course.id)}
                        >
                          {course.name}
                        </Chip>
                      ))}
                    </div>
                  )}
                />
                {form.formState.errors.courseId && (
                  <p role="alert" className="mt-1.5 text-tiny font-bold text-danger-strong">
                    {form.formState.errors.courseId.message}
                  </p>
                )}
              </fieldset>
            )}

            <Field
              label="Título del módulo"
              error={form.formState.errors.title?.message}
              className={fixedCourseId ? 'mt-5' : 'mt-[18px]'}
            >
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  {...form.register('title')}
                  placeholder="Ej. Present Perfect vs. Past Simple"
                  autoComplete="off"
                />
              )}
            </Field>

            <DialogFooter>
              <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="md" className="font-extrabold" disabled={pending}>
                {pending ? 'Creando…' : 'Crear módulo'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
