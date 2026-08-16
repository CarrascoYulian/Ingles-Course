'use client';

import { useEffect, useMemo, useState } from 'react';
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
  useDeleteStudent,
  useEnrollStudent,
  useInviteStudent,
  useResetStudentProgress,
  useSendStudentMessage,
  useStudents,
  useToggleStudentActive,
  useUnreadStudentIds,
  useUpdateStudent,
} from '../hooks/use-students';
import { BulkMessageDialog } from './bulk-message-dialog';
import { EditStudentDialog } from './edit-student-dialog';
import { EnrollStudentDialog } from './enroll-student-dialog';
import { InviteStudentDialog } from './invite-student-dialog';
import { MessageStudentDialog } from './message-student-dialog';

const LEVEL_FILTERS: Array<CefrLevel | 'Todos'> = ['Todos', ...CEFR_LEVELS.filter((l) => l !== 'C1')];

export function StudentsView() {
  const { query, appliedQuery } = useAdminSearch();
  const [level, setLevel] = useState<CefrLevel | 'Todos'>('Todos');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState<StudentSummary | null>(null);
  const [editTarget, setEditTarget] = useState<StudentSummary | null>(null);
  const [enrollTarget, setEnrollTarget] = useState<StudentSummary | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkMessageOpen, setBulkMessageOpen] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);

  const { data: result, isPending } = useStudents({ query: appliedQuery, level, page });
  const loadedStudents = result?.items;

  // El buscador tarda ~250 ms (más el viaje de red) en llegar a
  // `appliedQuery` — sin esto, cada tecleo se sentía "atascado" hasta que
  // ese viaje resolvía, y al borrar rápido la lista se veía saltar entre
  // resultados viejos y el reinicio del filtro. Este filtro sobre lo que ya
  // está cargado en memoria reacciona al instante con cada letra (`query`,
  // no `appliedQuery`); cuando la búsqueda del servidor llega, ya coincide y
  // este filtro pasa a ser un no-op.
  const needle = query.trim().toLocaleLowerCase();
  const students = useMemo(() => {
    if (!loadedStudents || !needle) return loadedStudents;
    return loadedStudents.filter(
      (student) =>
        student.name.toLocaleLowerCase().includes(needle) ||
        student.enrollmentCode.toLocaleLowerCase().includes(needle),
    );
  }, [loadedStudents, needle]);
  // El filtro instantáneo de arriba sólo conoce lo que YA está cargado (la
  // página que trajo la búsqueda anterior) — si el nombre que se está
  // escribiendo no estaba en esa página, da un "sin resultados" real por un
  // instante hasta que la búsqueda al servidor (debounced) trae la lista
  // correcta. Antes eso se mostraba como el `EmptyState` completo — un
  // parpadeo de "no hay nada" → resultados. Mientras el texto tecleado
  // todavía no coincide con la última búsqueda ya confirmada por el
  // servidor, un cero resultados locales no es definitivo: se trata como
  // "buscando", no como "sin resultados".
  const stillSearching = needle !== appliedQuery.trim().toLocaleLowerCase();
  const noResults = students?.length === 0 && !stillSearching;
  const searchingWithNoLocalMatch = students?.length === 0 && stillSearching;
  const resetProgress = useResetStudentProgress();
  const sendMessage = useSendStudentMessage();
  const invite = useInviteStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const enrollStudent = useEnrollStudent();
  const toggleActive = useToggleStudentActive();
  const { data: unreadStudentIds } = useUnreadStudentIds();
  const unreadSet = new Set(unreadStudentIds);
  const confirmDialog = useConfirmDialog();

  // La selección en bloque vive por página/filtro: cruzar páginas obligaría
  // a guardar nombres de estudiantes que ya no están cargados en memoria
  // sólo para poder mostrarlos en el diálogo de mensaje masivo.
  useEffect(() => setCheckedIds(new Set()), [page, level, appliedQuery]);
  const checkedStudents = students?.filter((student) => checkedIds.has(student.id)) ?? [];
  const allVisibleChecked = Boolean(students?.length) && students!.every((student) => checkedIds.has(student.id));

  const toggleCheck = (student: StudentSummary) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(student.id)) next.delete(student.id);
      else next.add(student.id);
      return next;
    });
  };

  const toggleCheckAllVisible = () => {
    setCheckedIds(allVisibleChecked ? new Set() : new Set(students?.map((student) => student.id) ?? []));
  };

  const sendBulkMessage = async ({ body }: { body: string }) => {
    setBulkSending(true);
    try {
      await Promise.all(
        checkedStudents.map((student) => sendMessage.mutateAsync({ id: student.id, name: student.name, body })),
      );
      toast.success(`Mensaje enviado a ${checkedStudents.length} estudiantes`);
      setBulkMessageOpen(false);
      setCheckedIds(new Set());
    } finally {
      setBulkSending(false);
    }
  };

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

        {students && students.length > 0 && (
          <div className="mb-2 flex items-center justify-between gap-2 lg:mb-2.5">
            <label className="flex cursor-pointer items-center gap-2 text-tiny font-bold text-fg-ghost">
              <input
                type="checkbox"
                checked={allVisibleChecked}
                onChange={toggleCheckAllVisible}
                aria-label="Seleccionar todos los estudiantes visibles"
                className="size-4 cursor-pointer accent-accent"
              />
              Seleccionar todos
            </label>

            {checkedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <p className="text-tiny font-bold text-fg-ghost">{checkedIds.size} seleccionados</p>
                <Button variant="ghost" size="xs" onClick={() => setBulkMessageOpen(true)}>
                  Enviar mensaje
                </Button>
                <Button variant="quiet" size="xs" onClick={() => setCheckedIds(new Set())}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        )}

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
                checked={checkedIds.has(student.id)}
                onToggleCheck={toggleCheck}
                hasUnreadMessage={unreadSet.has(student.id)}
              />
            ))}
          </ul>
        )}

        {searchingWithNoLocalMatch && (
          <div className="flex flex-col gap-2" aria-live="polite">
            <p className="px-1 text-tiny font-bold text-fg-ghost">Buscando…</p>
            <Skeleton className="h-[62px] rounded-3xl" />
          </div>
        )}

        {noResults && (
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
        hasUnreadMessage={selected ? unreadSet.has(selected.id) : false}
        onMessage={(student) => setMessageTarget(student)}
        onEdit={(student) => setEditTarget(student)}
        onEnroll={(student) => setEnrollTarget(student)}
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
        onDelete={(student) =>
          confirmDialog.confirm({
            title: 'Eliminar estudiante',
            body: `Se borrará la cuenta de ${student.name} y todos sus datos (matrícula, progreso, mensajes) de forma permanente en Supabase. Esta acción no se puede deshacer.`,
            confirmLabel: 'Sí, eliminar',
            onConfirm: () =>
              deleteStudent.mutateAsync({ id: student.id, name: student.name }).then(() => {
                setSelectedId(null);
                toast.dismiss();
              }),
          })
        }
        onToggleActive={(student) => {
          if (student.active) {
            confirmDialog.confirm({
              title: 'Desactivar estudiante',
              body: `${student.name} no podrá iniciar sesión con su matrícula y PIN mientras esté inactivo. Puedes reactivarlo cuando quieras.`,
              confirmLabel: 'Sí, desactivar',
              onConfirm: () =>
                toggleActive.mutateAsync({ id: student.id, name: student.name, active: false }).then(() => {
                  toast.dismiss();
                }),
            });
          } else {
            toggleActive.mutate({ id: student.id, name: student.name, active: true });
          }
        }}
      />

      <InviteStudentDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        pending={invite.isPending}
        onSubmit={(values) => invite.mutateAsync(values)}
      />

      <EditStudentDialog
        open={editTarget !== null}
        student={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        pending={updateStudent.isPending}
        onSubmit={(values) => {
          if (!editTarget) return Promise.resolve();
          return updateStudent.mutateAsync({
            id: editTarget.id,
            input: { fullName: values.fullName, level: values.level, pin: values.pin || undefined },
          });
        }}
      />

      <EnrollStudentDialog
        open={enrollTarget !== null}
        student={enrollTarget}
        onOpenChange={(open) => !open && setEnrollTarget(null)}
        pending={enrollStudent.isPending}
        onSubmit={(courseId) => {
          if (!enrollTarget) return Promise.resolve();
          return enrollStudent
            .mutateAsync({ id: enrollTarget.id, name: enrollTarget.name, courseId })
            .then(() => setEnrollTarget(null));
        }}
      />

      <MessageStudentDialog
        open={messageTarget !== null}
        studentId={messageTarget?.id ?? null}
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

      <BulkMessageDialog
        open={bulkMessageOpen}
        studentNames={checkedStudents.map((student) => student.name)}
        pending={bulkSending}
        onOpenChange={setBulkMessageOpen}
        onSubmit={sendBulkMessage}
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
