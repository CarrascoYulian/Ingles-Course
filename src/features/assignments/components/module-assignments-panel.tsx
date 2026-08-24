'use client';

import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';

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
  useRemoveAssignment,
  useUpdateAssignment,
} from '../hooks/use-assignments';

export function ModuleAssignmentsPanel({
  moduleId,
  moduleTitle,
  courseId,
}: {
  moduleId: string;
  moduleTitle: string;
  courseId: string;
}) {
  const { data: assignments, isPending: isAssignmentsPending } = useAssignments(moduleId);
  const createAssignment = useCreateAssignment(moduleId);
  const updateAssignment = useUpdateAssignment(moduleId);
  const removeAssignment = useRemoveAssignment(moduleId);
  const confirmDialog = useConfirmDialog();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null);
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
        <ol className="flex flex-col gap-2.5">
          {assignments.map((assignment) => {
            const isOpen = assignment.id === openAssignmentId;
            const theseSubmissions = (moduleSubmissions ?? []).filter(
              (s) => s.assignmentId === assignment.id,
            );
            return (
              <div key={assignment.id} className="flex flex-col gap-2">
                <AssignmentRow
                  assignment={assignment}
                  submissionCount={theseSubmissions.length}
                  gradedCount={theseSubmissions.filter((s) => s.gradedAt).length}
                  onOpen={() => setOpenAssignmentId(isOpen ? null : assignment.id)}
                  onEdit={() => {
                    setEditingAssignmentId(assignment.id);
                    setEditorOpen(true);
                  }}
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
