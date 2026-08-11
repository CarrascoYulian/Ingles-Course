'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useAdminHeader } from '@/components/admin/admin-shell';
import { StudentDetailCard } from '@/components/admin/student-detail-card';
import { StudentRow } from '@/components/admin/student-row';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { CEFR_LEVELS, type CefrLevel, type StudentSummary } from '@/types';
import { useAdminSearch } from '../hooks/use-admin-search';
import {
  useInviteStudent,
  useResetStudentProgress,
  useSendStudentMessage,
  useStudents,
} from '../hooks/use-students';
import { InviteStudentDialog } from './invite-student-dialog';
import { MessageStudentDialog } from './message-student-dialog';

const LEVEL_FILTERS: Array<CefrLevel | 'Todos'> = ['Todos', ...CEFR_LEVELS.filter((l) => l !== 'C1')];

export function StudentsView() {
  const { appliedQuery } = useAdminSearch();
  const [level, setLevel] = useState<CefrLevel | 'Todos'>('Todos');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState<StudentSummary | null>(null);

  const { data: result, isPending } = useStudents({ query: appliedQuery, level, page });
  const students = result?.items;
  const resetProgress = useResetStudentProgress();
  const sendMessage = useSendStudentMessage();
  const invite = useInviteStudent();
  const confirmDialog = useConfirmDialog();

  useAdminHeader(
    result ? `${result.total} estudiantes en total` : 'Cargando estudiantes…',
    () => setInviteOpen(true),
  );

  // Cambiar de filtro con una página distinta de 1 dejaría la lista vacía si
  // el nuevo resultado tiene menos páginas — se reinicia al filtrar.
  const changeLevel = (next: CefrLevel | 'Todos') => {
    setLevel(next);
    setPage(1);
  };
  useEffect(() => setPage(1), [appliedQuery]);

  // La selección se resuelve en render: si el filtro deja fuera al elegido,
  // se muestra el primero visible sin necesidad de un efecto de corrección.
  const selected: StudentSummary | null =
    students?.find((student) => student.id === selectedId) ?? students?.[0] ?? null;

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <div className="grid items-start gap-4 px-5 py-4 lg:grid-cols-[1fr_320px] lg:gap-[18px] lg:px-[30px] lg:py-6">
      <Card padding="md" className="max-lg:border-0 max-lg:bg-transparent max-lg:p-0">
        <ChipRow label="Filtrar por nivel" className="mb-3 flex-wrap lg:mb-3.5">
          {LEVEL_FILTERS.map((option) => (
            <Chip key={option} active={level === option} onClick={() => changeLevel(option)}>
              {option}
            </Chip>
          ))}
        </ChipRow>

        {isPending && (
          <div className="flex flex-col gap-2">
            <LoadingRegion label="Cargando estudiantes" />
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-[62px] rounded-3xl" />
            ))}
          </div>
        )}

        {students && students.length > 0 && (
          <ul
            role="listbox"
            aria-label="Estudiantes"
            className="flex flex-col gap-2 lg:gap-0.5"
          >
            {students.map((student) => (
              <StudentRow
                key={student.id}
                student={student}
                selected={selected?.id === student.id}
                onSelect={(next) => setSelectedId(next.id)}
              />
            ))}
          </ul>
        )}

        {students?.length === 0 && (
          <EmptyState
            title="Sin resultados para tu búsqueda"
            description="Prueba con la matrícula completa (ING-000072) o quita el filtro de nivel."
          />
        )}

        {result && result.total > result.pageSize && (
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
            <p className="text-tiny font-bold text-fg-ghost">
              Página {page} de {totalPages} · {result.total} estudiantes
            </p>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="ghost"
                size="xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>

      <StudentDetailCard
        student={selected}
        onMessage={(student) => setMessageTarget(student)}
        onReset={(student) =>
          confirmDialog.confirm({
            title: 'Reiniciar el progreso',
            body: `Se borrará todo el avance de ${student.name} y volverá al módulo 1. Esta acción no se puede deshacer.`,
            confirmLabel: 'Sí, reiniciar',
            onConfirm: () =>
              resetProgress.mutateAsync({ id: student.id, name: student.name }).then(() => {
                toast.dismiss();
              }),
          })
        }
      />

      <InviteStudentDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        pending={invite.isPending}
        onSubmit={(values) => invite.mutateAsync(values)}
      />

      <MessageStudentDialog
        open={messageTarget !== null}
        studentName={messageTarget?.name ?? null}
        pending={sendMessage.isPending}
        onOpenChange={(open) => !open && setMessageTarget(null)}
        onSubmit={(values) => {
          if (!messageTarget) return;
          return sendMessage
            .mutateAsync({ id: messageTarget.id, name: messageTarget.name, body: values.body })
            .then(() => undefined);
        }}
      />

      <ConfirmDialog
        request={confirmDialog.request}
        open={confirmDialog.isOpen}
        pending={confirmDialog.pending}
        onCancel={confirmDialog.dismiss}
        onConfirm={confirmDialog.accept}
      />
    </div>
  );
}
