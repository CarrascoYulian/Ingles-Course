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
import { useMarkStaffMessagesRead, useStudentMessages } from '../hooks/use-students';
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
  const {
    data,
    isPending: messagesPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useStudentMessages(studentId);
  // Páginas más nuevas primero (así llegan de la API); para mostrar el hilo
  // en orden cronológico hay que invertir el orden de páginas Y el de cada
  // página — la más vieja cargada arriba de todo, la más nueva al final.
  const messages = data ? [...data.pages].reverse().flatMap((page) => [...page.items].reverse()) : undefined;
  const bottomRef = useRef<HTMLDivElement>(null);
  const markRead = useMarkStaffMessagesRead();

  // Sólo baja al fondo al ABRIR el diálogo — si corriera en cada cambio de
  // `messages` también dispararía al cargar mensajes más viejos con
  // "Cargar anteriores", saltando la vista lejos de lo que se acaba de
  // desplegar arriba.
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [open]);

  useEffect(() => {
    if (open && studentId) markRead.mutate(studentId);
    // Sólo debe dispararse al abrir el hilo de un alumno, no en cada
    // render (`markRead` cambia de identidad en cada uno).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studentId]);

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
              {hasNextPage && (
                <li className="flex justify-center pb-1">
                  <button
                    type="button"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="text-tiny font-bold text-fg-dim hover:text-fg disabled:opacity-50"
                  >
                    {isFetchingNextPage ? 'Cargando…' : 'Cargar mensajes anteriores'}
                  </button>
                </li>
              )}
              {messages.map((message) => (
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
