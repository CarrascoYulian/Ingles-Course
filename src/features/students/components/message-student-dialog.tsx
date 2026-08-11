'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useStudentMessages } from '../hooks/use-students';
import { messageStudentSchema, type MessageStudentValues } from '../schemas';

export interface MessageStudentDialogProps {
  open: boolean;
  studentId: string | null;
  studentName: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: MessageStudentValues) => Promise<void> | void;
  pending?: boolean;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('es-DO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * Antes "Enviar mensaje" mandaba siempre el mismo texto fijo y el diálogo
 * se cerraba de inmediato al enviar — no había ningún lugar donde ver los
 * mensajes ya mandados. Ahora se pide el texto real, se queda abierto tras
 * enviar y muestra el historial real (`messages`).
 */
export function MessageStudentDialog({
  open,
  studentId,
  studentName,
  onOpenChange,
  onSubmit,
  pending,
}: MessageStudentDialogProps) {
  const { data: messages, isPending: messagesPending } = useStudentMessages(studentId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [open, messages]);

  const form = useForm<MessageStudentValues>({
    resolver: zodResolver(messageStudentSchema),
    defaultValues: { body: '' },
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (open) form.reset({ body: '' });
  }, [open, form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      form.reset({ body: '' });
    } catch {
      // El error ya se muestra vía toast (onError de useSendStudentMessage).
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={460}>
        <DialogTitle>Mensajes</DialogTitle>
        {studentName && <DialogDescription>Con {studentName}</DialogDescription>}

        <div className="mt-4 max-h-[280px] overflow-y-auto rounded-2xl border border-line bg-surface-sunken p-3">
          {messagesPending && (
            <p className="text-body-sm font-semibold text-fg-faint">Cargando historial…</p>
          )}
          {!messagesPending && messages?.length === 0 && (
            <p className="text-body-sm font-semibold text-fg-faint">
              Todavía no le has escrito a {studentName ?? 'este estudiante'}.
            </p>
          )}
          {messages && messages.length > 0 && (
            <ul className="flex flex-col gap-2">
              {[...messages].reverse().map((message) => (
                <li key={message.id} className={cn('flex', message.fromStaff ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-3 py-2',
                      // Aquí "yo" soy el docente: verde a la derecha, azul
                      // (el alumno) a la izquierda — invertido respecto a la
                      // bandeja del alumno, donde el color va por persona,
                      // no por rol.
                      message.fromStaff ? 'rounded-br-sm bg-success-soft' : 'rounded-bl-sm bg-accent-soft',
                    )}
                  >
                    <p className="text-body-sm font-medium text-fg">{message.body}</p>
                    <p
                      className={cn(
                        'mt-0.5 text-micro font-bold',
                        message.fromStaff ? 'text-success-strong' : 'text-accent',
                      )}
                    >
                      {message.fromStaff ? 'Tú' : studentName} · {formatWhen(message.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={submit} noValidate>
          <Field label="Nuevo mensaje" error={form.formState.errors.body?.message} className="mt-4">
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                {...form.register('body')}
                placeholder="Escribe el mensaje…"
                autoFocus
              />
            )}
          </Field>

          <DialogFooter>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button type="submit" size="md" className="font-extrabold" disabled={pending}>
              {pending ? 'Enviando…' : 'Enviar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
