'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import type { AuditLogEntry } from '@/types';
import { useAuditLog } from '../hooks/use-audit';

const ACTION_LABEL: Record<string, string> = {
  delete: 'Borró',
  publish: 'Publicó',
  unpublish: 'Despublicó',
  archive: 'Archivó',
  unarchive: 'Desarchivó',
  invite: 'Invitó',
  activate: 'Activó',
  deactivate: 'Desactivó',
};

const ENTITY_LABEL: Record<string, string> = {
  course: 'un curso',
  module: 'una unidad',
  lesson: 'una lección',
  quiz: 'una evaluación',
  assignment: 'una tarea',
  student: 'a un estudiante',
  staff: 'a un miembro del staff',
};

function describe(entry: AuditLogEntry): string {
  const action = ACTION_LABEL[entry.action] ?? entry.action;
  const entity = ENTITY_LABEL[entry.entityType] ?? entry.entityType;
  return `${action} ${entity}${entry.entityLabel ? ` · ${entry.entityLabel}` : ''}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
}

export function AuditLogView() {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const { data, isLoading } = useAuditLog(page);

  useEffect(() => {
    if (!data) return;
    setItems((prev) => (page === 1 ? data.items : [...prev, ...data.items]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const merged = items;
  const loadMore = () => setPage((p) => p + 1);

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-4 px-5 py-6 lg:px-[30px] lg:py-8">
      {isLoading && page === 1 && <p className="text-meta font-semibold text-fg-faint">Cargando…</p>}

      {!isLoading && merged.length === 0 && (
        <EmptyState
          title="Sin actividad todavía"
          description="Acá vas a ver los borrados, publicaciones e invitaciones del panel."
        />
      )}

      {merged.length > 0 && (
        <Card padding="none" className="divide-y divide-line">
          {merged.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-body-sm font-bold text-fg">{describe(entry)}</p>
                <p className="text-tiny font-medium text-fg-faint">{entry.actorName}</p>
              </div>
              <p className="shrink-0 text-tiny font-semibold text-fg-faint">{formatDate(entry.createdAt)}</p>
            </div>
          ))}
        </Card>
      )}

      {data?.hasMore && (
        <Button variant="outline" size="md" onClick={loadMore} className="mx-auto">
          Cargar más
        </Button>
      )}
    </div>
  );
}
