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
import { Textarea } from '@/components/ui/textarea';
import {
  EMPTY_PRACTICE_QUESTION_FORM,
  practiceQuestionFormSchema,
  type PracticeQuestionFormValues,
} from '../schemas';
import type { PracticeQuestionAdmin, PracticeQuestionInput } from '@/types';

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;
const OPTION_FIELD: Record<(typeof OPTION_KEYS)[number], 'optionA' | 'optionB' | 'optionC' | 'optionD'> = {
  A: 'optionA',
  B: 'optionB',
  C: 'optionC',
  D: 'optionD',
};
const KEY_TO_ID: Record<(typeof OPTION_KEYS)[number], string> = { A: 'a', B: 'b', C: 'c', D: 'd' };

function toFormValues(question: PracticeQuestionAdmin | null): PracticeQuestionFormValues {
  if (!question) return EMPTY_PRACTICE_QUESTION_FORM;

  const textByKey = new Map(question.options.map((option) => [option.key, option.text]));
  const keyById = new Map(question.options.map((option) => [option.id, option.key]));

  return {
    category: question.category,
    xpReward: question.xpReward,
    prompt: question.prompt,
    sourceText: question.sourceText,
    optionA: textByKey.get('A') ?? '',
    optionB: textByKey.get('B') ?? '',
    optionC: textByKey.get('C') ?? '',
    optionD: textByKey.get('D') ?? '',
    correctKeys: question.correctOptionIds
      .map((id) => keyById.get(id))
      .filter((key): key is 'A' | 'B' | 'C' | 'D' => key !== undefined),
    explanationCorrect: question.explanationCorrect,
    explanationWrong: question.explanationWrong,
  };
}

function toInput(values: PracticeQuestionFormValues): PracticeQuestionInput {
  return {
    category: values.category,
    xpReward: values.xpReward,
    prompt: values.prompt,
    sourceText: values.sourceText,
    options: OPTION_KEYS.map((key) => ({
      id: KEY_TO_ID[key],
      key,
      text: values[OPTION_FIELD[key]],
    })),
    correctOptionIds: values.correctKeys.map((key) => KEY_TO_ID[key]),
    explanationCorrect: values.explanationCorrect,
    explanationWrong: values.explanationWrong,
  };
}

export interface PracticeQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = crear una pregunta nueva; con valor = editar esa pregunta. */
  question: PracticeQuestionAdmin | null;
  onSubmit: (input: PracticeQuestionInput) => Promise<unknown>;
  pending?: boolean;
}

/**
 * Antes las 4 opciones y su respuesta correcta venían precargadas en una
 * migración SQL (16 por nivel). Ahora el profesor las escribe acá: 4 campos
 * de texto fijos (A-D) y hasta 2 marcadas como correctas — cualquiera de
 * las marcadas cuenta como acierto para el alumno.
 */
export function PracticeQuestionDialog({
  open,
  onOpenChange,
  question,
  onSubmit,
  pending,
}: PracticeQuestionDialogProps) {
  const isEditing = question !== null;

  const form = useForm<PracticeQuestionFormValues>({
    resolver: zodResolver(practiceQuestionFormSchema),
    defaultValues: EMPTY_PRACTICE_QUESTION_FORM,
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(question));
    // Sólo debe resetear al abrir el diálogo (o cambiar de pregunta objetivo),
    // no en cada tecleo — de ahí que `form` no viaje en las dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, question]);

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(toInput(values));
      onOpenChange(false);
    } catch {
      // El error ya se muestra vía toast (onError de la mutación).
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={560}>
        <DialogTitle>{isEditing ? 'Editar pregunta' : 'Nueva pregunta'}</DialogTitle>
        <DialogDescription>
          4 opciones de respuesta; marca 1 o 2 como correctas. Cualquiera de las marcadas cuenta
          como acierto.
        </DialogDescription>

        <form onSubmit={submit} noValidate className="max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoría" error={form.formState.errors.category?.message}>
              {(fieldProps) => (
                <Input {...fieldProps} {...form.register('category')} placeholder="Ej. GRAMÁTICA" />
              )}
            </Field>
            <Field label="XP al acertar" error={form.formState.errors.xpReward?.message}>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="number"
                  min={1}
                  max={200}
                  {...form.register('xpReward', { valueAsNumber: true })}
                />
              )}
            </Field>
          </div>

          <Field
            label="Enunciado"
            error={form.formState.errors.prompt?.message}
            className="mt-[18px]"
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                {...form.register('prompt')}
                placeholder="Elige la traducción correcta"
              />
            )}
          </Field>

          <Field
            label="Frase a traducir"
            error={form.formState.errors.sourceText?.message}
            className="mt-[18px]"
          >
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                {...form.register('sourceText')}
                rows={2}
                placeholder='"Hola, ¿cómo estás?"'
              />
            )}
          </Field>

          <fieldset className="mt-[18px]">
            <legend className="text-meta font-bold text-fg-subtle">Opciones de respuesta</legend>
            <div className="mt-2 flex flex-col gap-2.5">
              {OPTION_KEYS.map((key) => (
                <Field
                  key={key}
                  label={`Opción ${key}`}
                  error={form.formState.errors[OPTION_FIELD[key]]?.message}
                >
                  {(fieldProps) => (
                    <Input {...fieldProps} {...form.register(OPTION_FIELD[key])} placeholder="Texto en inglés" />
                  )}
                </Field>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-[18px]">
            <legend className="text-meta font-bold text-fg-subtle">Respuesta(s) correcta(s)</legend>
            <Controller
              control={form.control}
              name="correctKeys"
              render={({ field }) => (
                <div role="group" aria-label="Respuestas correctas" className="mt-2 flex gap-2">
                  {OPTION_KEYS.map((key) => {
                    const active = field.value.includes(key);
                    return (
                      <Chip
                        key={key}
                        active={active}
                        onClick={() =>
                          field.onChange(
                            active
                              ? field.value.filter((k) => k !== key)
                              : field.value.length < 2
                                ? [...field.value, key]
                                : field.value,
                          )
                        }
                      >
                        {key}
                      </Chip>
                    );
                  })}
                </div>
              )}
            />
            {form.formState.errors.correctKeys && (
              <p role="alert" className="mt-1.5 text-tiny font-bold text-danger-strong">
                {form.formState.errors.correctKeys.message}
              </p>
            )}
          </fieldset>

          <Field
            label="Explicación si acierta"
            error={form.formState.errors.explanationCorrect?.message}
            className="mt-[18px]"
          >
            {(fieldProps) => (
              <Textarea {...fieldProps} {...form.register('explanationCorrect')} rows={2} />
            )}
          </Field>

          <Field
            label="Explicación si se equivoca"
            error={form.formState.errors.explanationWrong?.message}
            className="mt-[18px]"
          >
            {(fieldProps) => (
              <Textarea {...fieldProps} {...form.register('explanationWrong')} rows={2} />
            )}
          </Field>

          <DialogFooter>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="md" className="font-extrabold" disabled={pending}>
              {pending ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear pregunta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
