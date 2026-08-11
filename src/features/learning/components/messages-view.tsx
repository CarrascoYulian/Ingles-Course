'use client';

import { useEffect, useState } from 'react';

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useMarkMessageRead, useMyMessages, useSendMyMessage } from '../hooks/use-learning';

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('es-DO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * Antes el docente sólo podía ENVIAR mensajes y el alumno no tenía forma
 * de leerlos ni de responder — ahora es una conversación real, en formato
 * chat: el mío a la derecha, el más nuevo abajo (como cualquier app de
 * mensajería), no una lista de tarjetas con el más nuevo arriba.
 */
export function MessagesView() {
  const { data: messages, isPending } = useMyMessages();
  const markRead = useMarkMessageRead();
  const sendMessage = useSendMyMessage();
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!messages) return;
    messages.filter((m) => m.fromStaff && !m.readAt).forEach((m) => markRead.mutate(m.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const submit = () => {
    if (!draft.trim()) return;
    sendMessage.mutate(draft.trim());
    setDraft('');
  };

  // El backend devuelve el más nuevo primero (para la campanita de no
  // leídos); un chat se lee de arriba (viejo) hacia abajo (nuevo).
  const chronological = messages ? [...messages].reverse() : [];

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-3 px-5 py-5 lg:gap-3.5 lg:px-[30px] lg:py-[26px]">
      <PageHeader title="Mensajes" description="Escríbele a tu docente y lee lo que te ha escrito." />

      {isPending && (
        <>
          <LoadingRegion label="Cargando mensajes" />
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[74px] rounded-5xl" />
          ))}
        </>
      )}

      {chronological.length > 0 && (
        <ul className="flex flex-col gap-2">
          {chronological.map((message) => (
            <li key={message.id} className={cn('flex', message.fromStaff ? 'justify-start' : 'justify-end')}>
              <div
                className={cn(
                  'max-w-[78%] rounded-2xl px-3.5 py-2.5 sm:max-w-[65%]',
                  // Docente = azul, alumno (yo) = verde — mismo color por
                  // persona en toda la conversación, no según quién mira.
                  message.fromStaff
                    ? 'rounded-bl-sm bg-accent-soft text-fg'
                    : 'rounded-br-sm bg-success-soft text-fg',
                )}
              >
                <p className="text-body-sm font-medium leading-[1.5]">{message.body}</p>
                <p
                  className={cn(
                    'mt-0.5 text-micro font-bold',
                    message.fromStaff ? 'text-accent' : 'text-success-strong',
                  )}
                >
                  {formatWhen(message.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {messages?.length === 0 && (
        <EmptyState
          title="Todavía no tienes mensajes"
          description="Aquí verás los mensajes que te escriba tu docente."
        />
      )}

      <Card padding="lg" radius="xl">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Escríbele a tu docente…"
        />
        <Button
          size="sm"
          onClick={submit}
          disabled={!draft.trim() || sendMessage.isPending}
          className="mt-3 rounded-lg px-[15px] py-[9px] text-label"
        >
          {sendMessage.isPending ? 'Enviando…' : 'Enviar'}
        </Button>
      </Card>
    </div>
  );
}
