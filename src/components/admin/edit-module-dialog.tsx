'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { Module } from '@/types';

export interface EditModuleValues {
  title: string;
  requiresModuleId: string | null;
}

export interface EditModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Resto de unidades del curso, para elegir el prerrequisito — nunca incluye la propia unidad. */
  otherModules: Module[];
  initialValues: EditModuleValues | null;
  onSubmit: (values: EditModuleValues) => Promise<unknown>;
  pending?: boolean;
}

/**
 * Antes `createModule` era la única operación disponible sobre una unidad —
 * un docente que se equivocaba de título tenía que borrar y recrearla desde
 * cero (perdiendo el orden relativo con las demás), y el prerrequisito
 * ("requiere completar la unidad anterior") ni siquiera se podía asignar:
 * `createModule` siempre lo dejaba en `null` y no había ningún formulario
 * que lo expusiera.
 */
export function EditModuleDialog({
  open,
  onOpenChange,
  otherModules,
  initialValues,
  onSubmit,
  pending,
}: EditModuleDialogProps) {
  const form = useForm<EditModuleValues>({ defaultValues: { title: '', requiresModuleId: null } });

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
        <DialogTitle>Editar unidad</DialogTitle>
        <DialogDescription>El alumno ve el título en el índice del curso.</DialogDescription>

        <form onSubmit={submit} noValidate>
          <Field label="Título de la unidad" className="mt-5">
            {(fieldProps) => (
              <Input {...fieldProps} {...form.register('title', { required: true })} autoFocus />
            )}
          </Field>

          <fieldset className="mt-[18px]">
            <legend className="text-meta font-bold text-fg-subtle">
              Requiere completar antes
            </legend>
            <Controller
              control={form.control}
              name="requiresModuleId"
              render={({ field }) => (
                <div role="radiogroup" aria-label="Unidad requerida" className="mt-2 flex flex-wrap gap-2">
                  <Chip
                    role="radio"
                    aria-checked={field.value === null}
                    active={field.value === null}
                    onClick={() => field.onChange(null)}
                  >
                    Ninguna
                  </Chip>
                  {otherModules.map((module) => (
                    <Chip
                      key={module.id}
                      role="radio"
                      aria-checked={field.value === module.id}
                      active={field.value === module.id}
                      onClick={() => field.onChange(module.id)}
                    >
                      {module.title}
                    </Chip>
                  ))}
                </div>
              )}
            />
            {otherModules.length === 0 && (
              <p className="mt-2 text-tiny font-semibold text-fg-disabled">
                No hay otra unidad en este curso todavía.
              </p>
            )}
          </fieldset>

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
