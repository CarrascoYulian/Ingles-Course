'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Shuffle } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { StudentSummary } from '@/types';
import { CEFR_ENROLLMENT_LEVELS, editStudentSchema, type EditStudentValues } from '../schemas';

export interface EditStudentDialogProps {
  open: boolean;
  student: StudentSummary | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: EditStudentValues) => Promise<unknown>;
  pending?: boolean;
}

function randomPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * PIN vacío = no lo toca. Sólo cuando el maestro escribe un PIN nuevo se
 * resetea la contraseña real en Auth (ver ruta PATCH /api/students/[id]).
 */
export function EditStudentDialog({ open, student, onOpenChange, onSubmit, pending }: EditStudentDialogProps) {
  const form = useForm<EditStudentValues>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: { fullName: '', level: 'A1', pin: '' },
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (open && student) {
      form.reset({ fullName: student.name, level: student.level, pin: '' });
    }
  }, [open, student, form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch {
      // El error ya se muestra vía toast (onError de useUpdateStudent).
    }
  });

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={420}>
        <DialogTitle>Editar estudiante</DialogTitle>
        <DialogDescription>
          Matrícula {student.enrollmentCode}. Deja el PIN vacío si no quieres cambiarlo.
        </DialogDescription>

        <form onSubmit={submit} noValidate>
          <Field label="Nombre completo" error={form.formState.errors.fullName?.message} className="mt-5">
            {(fieldProps) => (
              <Input {...fieldProps} {...form.register('fullName')} autoComplete="off" autoFocus />
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
            label="Nuevo PIN (opcional)"
            error={form.formState.errors.pin?.message}
            className="mt-[18px]"
          >
            {(fieldProps) => (
              <div className="flex gap-2">
                <Input
                  {...fieldProps}
                  {...form.register('pin')}
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Dejar vacío para no cambiar"
                  autoComplete="off"
                  className="tracking-[0.3em]"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => form.setValue('pin', randomPin(), { shouldValidate: true })}
                  aria-label="Generar PIN aleatorio"
                >
                  <Shuffle aria-hidden size={15} strokeWidth={2.2} />
                </Button>
              </div>
            )}
          </Field>

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
