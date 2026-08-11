'use client';

import { useEffect } from 'react';

import { PageHeader } from '@/components/shared/page-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { useMarkMessageRead, useMyMessages } from '../hooks/use-learning';

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('es-DO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * Antes el docente sólo podía ENVIAR mensajes — no existía ningún lugar
 * donde el alumno pudiera leerlos.
 */
export function MessagesView() {
  const { data: messages, isPending } = useMyMessages();
  const markRead = useMarkMessageRead();

  useEffect(() => {
    if (!messages) return;
    messages.filter((m) => m.fromStaff && !m.readAt).forEach((m) => markRead.mutate(m.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-3 px-5 py-5 lg:gap-3.5 lg:px-[30px] lg:py-[26px]">
      <PageHeader title="Mensajes" description="Lo que tu docente te ha escrito." />

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
    </div>
  );
}
