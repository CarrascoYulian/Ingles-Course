'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy, Shuffle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

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
  onSubmit: (values: InviteStudentValues) => Promise<{ enrollmentCode: string }>;
  pending?: boolean;
}

const DEFAULT_VALUES: InviteStudentValues = { fullName: '', level: 'A1', pin: '' };

function randomPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * El estudiante entra con su matrícula (asignada automáticamente al crear)
 * y un PIN de 4 dígitos — no con correo ni contraseña de texto libre. No se
 * envía ninguna invitación por email.
 *
 * Antes, al crear el estudiante, el diálogo se cerraba de inmediato y la
 * matrícula sólo aparecía un instante en un toast — si el maestro no lo leía
 * a tiempo, tenía que ir a buscarla en la lista. Ahora el diálogo se queda
 * abierto con la matrícula y el PIN en un recuadro, listos para copiar.
 */
export function InviteStudentDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: InviteStudentDialogProps) {
  const [created, setCreated] = useState<{ fullName: string; enrollmentCode: string; pin: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  const form = useForm<InviteStudentValues>({
    resolver: zodResolver(inviteStudentSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (open) {
      form.reset(DEFAULT_VALUES);
      setCreated(null);
      setCopied(false);
    }
  }, [open, form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      const { enrollmentCode } = await onSubmit(values);
      setCreated({ fullName: values.fullName, enrollmentCode, pin: values.pin });
    } catch {
      // El error ya se muestra vía toast (onError de useInviteStudent). El
      // diálogo se queda abierto para reintentar, en vez de dejar que el
      // rechazo suba sin capturar y tumbe la página.
    }
  });

  const copyCredentials = async () => {
    if (!created) return;
    const text = `Matrícula: ${created.enrollmentCode}\nPIN: ${created.pin}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar. Cópialo manualmente.');
    }
  };

  if (created) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent width={420}>
          <DialogTitle>Estudiante creado</DialogTitle>
          <DialogDescription>
            Comparte esta matrícula y PIN con “{created.fullName}” para que pueda entrar.
          </DialogDescription>

          <div className="mt-5 rounded-2xl border border-line-strong bg-surface-sunken p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-tiny font-bold text-fg-ghost">Matrícula</p>
                <p className="text-title-sm font-extrabold tracking-tight-2 text-fg">
                  {created.enrollmentCode}
                </p>
              </div>
              <div>
                <p className="text-tiny font-bold text-fg-ghost">PIN</p>
                <p className="text-title-sm font-extrabold tracking-tight-2 text-fg">
                  {created.pin}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyCredentials}
              className="mt-3.5 w-full"
            >
              {copied ? (
                <>
                  <Check aria-hidden size={14} strokeWidth={2.4} /> Copiado
                </>
              ) : (
                <>
                  <Copy aria-hidden size={14} strokeWidth={2.4} /> Copiar matrícula y PIN
                </>
              )}
            </Button>
          </div>

          <DialogFooter>
            <Button size="md" className="font-extrabold" onClick={() => onOpenChange(false)}>
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={420}>
        <DialogTitle>Nuevo estudiante</DialogTitle>
        <DialogDescription>
          La matrícula se genera automáticamente. El alumno entra con esa matrícula y el PIN de
          4 dígitos que le pongas aquí.
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

          <Field label="PIN (4 dígitos)" error={form.formState.errors.pin?.message} className="mt-[18px]">
            {(fieldProps) => (
              <div className="flex gap-2">
                <Input
                  {...fieldProps}
                  {...form.register('pin')}
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="0000"
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
              {pending ? 'Creando…' : 'Crear estudiante'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
