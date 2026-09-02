'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { AssignmentEditorDialog } from '@/components/admin/assignment-editor-dialog';
import { AssignmentRow } from '@/components/admin/assignment-row';
import { AssignmentSubmissionsTable } from '@/components/admin/assignment-submissions-table';
import { GradeSubmissionDialog } from '@/components/admin/grade-submission-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { backend } from '@/services';
import type { AssignmentSubmission } from '@/types';
import {
  useAssignments,
  useCreateAssignment,
  useGradeSubmission,
  useModuleSubmissions,
  useMoveAssignment,
  useReorderAssignment,
  useRemoveAssignment,
  useUpdateAssignment,
} from '../hooks/use-assignments';

export function ModuleAssignmentsPanel({
  moduleId,
  moduleTitle,
  courseId,
  initialAssignmentId,
}: {
  moduleId: string;
  moduleTitle: string;
  courseId: string;
  /** Deep link desde la campana de notificaciones — abre y resalta esta tarea al cargar. */
  initialAssignmentId?: string;
}) {
  const { data: assignments, isPending: isAssignmentsPending } = useAssignments(moduleId);
  const createAssignment = useCreateAssignment(moduleId);
  const updateAssignment = useUpdateAssignment(moduleId);
  const removeAssignment = useRemoveAssignment(moduleId);
  const moveAssignment = useMoveAssignment(moduleId);
  const reorderAssignment = useReorderAssignment(moduleId);
  const confirmDialog = useConfirmDialog();
  const sensors = useSensors(
    // `activationConstraint` con distancia mínima: sin esto, cualquier click
    // normal en la fila se interpretaba como el inicio de un arrastre y
    // bloqueaba el click simple — mismo ajuste que `ContentView`.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !assignments) return;
    const from = assignments.findIndex((a) => a.id === active.id);
    const to = assignments.findIndex((a) => a.id === over.id);
    if (from < 0 || to < 0) return;
    reorderAssignment.mutate({ assignmentId: String(active.id), from, to });
  };

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null);
  // Sólo se auto-abre y resalta una vez, la primera vez que las tareas
  // llegan — si el docente cierra el panel y lo vuelve a abrir a mano no
  // debe repetirse el destello.
  const deepLinkHandled = useRef(false);
  const [highlightAssignmentId, setHighlightAssignmentId] = useState<string | null>(null);
  useEffect(() => {
    if (deepLinkHandled.current || !initialAssignmentId || !assignments) return;
    deepLinkHandled.current = true;
    if (!assignments.some((a) => a.id === initialAssignmentId)) return;
    setOpenAssignmentId(initialAssignmentId);
    setHighlightAssignmentId(initialAssignmentId);
    const timeout = setTimeout(() => setHighlightAssignmentId(null), 1800);
    return () => clearTimeout(timeout);
  }, [assignments, initialAssignmentId]);
  const [gradingSubmission, setGradingSubmission] = useState<AssignmentSubmission | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  // `fileUrlMutation` es una sola instancia compartida por todas las filas:
  // si el docente abre la entrega A (lenta) y después la B antes de que A
  // resuelva, el `onSuccess` de A podía llegar tarde y pisar la URL de B.
  // Este ref guarda cuál es la entrega vigente para descartar respuestas
  // obsoletas.
  const gradingRequestRef = useRef<string | null>(null);

  const editingAssignment = assignments?.find((a) => a.id === editingAssignmentId) ?? null;
  // Todas las entregas del módulo de una — así el contador de cada fila
  // ("N entregas · N calificadas") es correcto aunque esa tarea nunca se
  // haya expandido, en vez de depender de un fetch por tarea al abrirla.
  const { data: moduleSubmissions, isPending: isSubmissionsPending } = useModuleSubmissions(moduleId);
  const gradeSubmission = useGradeSubmission(moduleId);

  const fileUrlMutation = useMutation({
    mutationFn: (mediaKey: string) => backend.content.getFileUrl(mediaKey),
  });

  return (
    <div className="flex flex-col gap-2.5">
      <Card radius="md" className="flex items-center justify-between px-[18px] py-3.5">
        <div>
          <h2 className="text-body-lg font-bold text-fg">Tareas</h2>
          <p className="mt-0.5 text-meta font-semibold text-fg-ghost">{moduleTitle}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditingAssignmentId(null);
            setEditorOpen(true);
          }}
        >
          + Nueva tarea
        </Button>
      </Card>

      {isAssignmentsPending && (
        <>
          <LoadingRegion label="Cargando tareas de la unidad" />
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-[74px] rounded-4xl" />
          ))}
        </>
      )}

      {!isAssignmentsPending && assignments && assignments.length === 0 && (
        <EmptyState
          compact
          title="Sin tareas todavía"
          description="Creá la primera tarea para esta unidad con el botón de arriba."
        />
      )}

      {!isAssignmentsPending && assignments && assignments.length > 0 && (
        <DndContext
          sensors={sensors}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={assignments.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <ol className="flex flex-col gap-2.5">
              {assignments.map((assignment, index) => {
                const isOpen = assignment.id === openAssignmentId;
                const theseSubmissions = (moduleSubmissions ?? []).filter(
                  (s) => s.assignmentId === assignment.id,
                );
                const isHighlighted = assignment.id === highlightAssignmentId;
                return (
                  <div key={assignment.id} className="flex flex-col gap-2">
                    <AssignmentRow
                      assignment={assignment}
                      index={index}
                      total={assignments.length}
                      submissionCount={theseSubmissions.length}
                      gradedCount={theseSubmissions.filter((s) => s.gradedAt).length}
                      highlighted={isHighlighted}
                      onOpen={() => setOpenAssignmentId(isOpen ? null : assignment.id)}
                      onEdit={() => {
                        setEditingAssignmentId(assignment.id);
                        setEditorOpen(true);
                      }}
                      onMove={(direction) => moveAssignment.mutate({ assignmentId: assignment.id, direction })}
                      onDelete={() =>
                        confirmDialog.confirm({
                          title: 'Eliminar la tarea',
                          body: `“${assignment.title}” se eliminará junto con todas las entregas de los alumnos. Esta acción no se puede deshacer.`,
                          confirmLabel: 'Sí, eliminar',
                          onConfirm: () => removeAssignment.mutateAsync(assignment.id),
                        })
                      }
                    />
                    {isOpen && (
                      <div className="pl-2">
                        {isSubmissionsPending ? (
                          <Skeleton className="h-24 rounded-3xl" />
                        ) : (
                          <AssignmentSubmissionsTable
                            assignment={assignment}
                            submissions={theseSubmissions}
                            highlightUngraded={isHighlighted}
                            onGrade={(submission) => {
                              setGradingSubmission(submission);
                              setFileUrl(null);
                              gradingRequestRef.current = submission.id;
                              fileUrlMutation.mutate(submission.mediaKey, {
                                onSuccess: (url) => {
                                  if (gradingRequestRef.current === submission.id) setFileUrl(url);
                                },
                              });
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      <AssignmentEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        moduleId={moduleId}
        courseId={courseId}
        moduleTitle={moduleTitle}
        assignment={editingAssignment}
        pending={createAssignment.isPending || updateAssignment.isPending}
        onSave={(input) => {
          if (editingAssignment) {
            updateAssignment.mutate(
              { id: editingAssignment.id, input },
              { onSuccess: () => setEditorOpen(false) },
            );
          } else {
            createAssignment.mutate({ moduleId, ...input }, { onSuccess: () => setEditorOpen(false) });
          }
        }}
      />

      <GradeSubmissionDialog
        open={gradingSubmission !== null}
        onOpenChange={(open) => !open && setGradingSubmission(null)}
        submission={gradingSubmission}
        fileUrl={fileUrl}
        urlPending={fileUrlMutation.isPending}
        pending={gradeSubmission.isPending}
        onGrade={(grade, feedback) => {
          if (!gradingSubmission) return;
          gradeSubmission.mutate(
            { submissionId: gradingSubmission.id, grade, feedback },
            { onSuccess: () => setGradingSubmission(null) },
          );
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
