'use client';

import { useEffect, useState } from 'react';

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useMarkMessageRead, useMyMessages, useSendMyMessage } from '../hooks/use-learning';

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('es-DO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * Antes el docente sólo podía ENVIAR mensajes y el alumno no tenía forma
 * de leerlos ni de responder — ahora la bandeja es de ida y vuelta.
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

      {messages && messages.length > 0 && (
        <ul className="flex flex-col gap-2.5 lg:gap-3.5">
          {messages.map((message) => (
            <li key={message.id}>
              <Card padding="lg" radius="xl">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-tiny font-bold text-fg-ghost">
                    {message.fromStaff ? 'Tu docente' : 'Tú'}
                  </p>
                  <p className="text-tiny font-semibold text-fg-ghost">{formatWhen(message.createdAt)}</p>
                </div>
                <p className="mt-1.5 text-body-sm font-medium leading-[1.55] text-fg-body">
                  {message.body}
                </p>
              </Card>
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
