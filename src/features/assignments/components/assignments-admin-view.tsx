'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useAdminHeader } from '@/components/admin/admin-shell';
import { AssignmentEditorDialog } from '@/components/admin/assignment-editor-dialog';
import { AssignmentRow } from '@/components/admin/assignment-row';
import { AssignmentSubmissionsTable } from '@/components/admin/assignment-submissions-table';
import { GradeSubmissionDialog } from '@/components/admin/grade-submission-dialog';
import { ModuleList } from '@/components/admin/module-list';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import { useCourses } from '@/features/courses/hooks/use-courses';
import { useModules } from '@/features/content/hooks/use-content-blocks';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { backend } from '@/services';
import { useMutation } from '@tanstack/react-query';
import type { AssignmentSubmission } from '@/types';
import {
  useAssignments,
  useAssignmentSubmissions,
  useCreateAssignment,
  useGradeSubmission,
  useRemoveAssignment,
  useUpdateAssignment,
} from '../hooks/use-assignments';

export function AssignmentsAdminView() {
  const courseId = useSearchParams().get('courseId') ?? '';

  const { data: courses } = useCourses();
  const course = courses?.find((c) => c.id === courseId);

  const { data: modules, isPending: isModulesPending } = useModules(courseId);
  const [selectedModuleId, setSelectedModuleId] = useState('');

  const syncedFor = useRef('');
  useEffect(() => {
    if (!modules || syncedFor.current === courseId) return;
    syncedFor.current = courseId;
    setSelectedModuleId(modules[0]?.id ?? '');
  }, [modules, courseId]);

  const activeModule = modules?.find((m) => m.id === selectedModuleId);
  const moduleId = activeModule?.id ?? '';

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

  const editingAssignment = assignments?.find((a) => a.id === editingAssignmentId) ?? null;
  const { data: submissions, isPending: isSubmissionsPending } = useAssignmentSubmissions(
    openAssignmentId ?? '',
  );
  const gradeSubmission = useGradeSubmission(openAssignmentId ?? '');

  const fileUrlMutation = useMutation({
    mutationFn: (mediaKey: string) => backend.content.getFileUrl(mediaKey),
  });

  useAdminHeader(activeModule ? `${activeModule.title} · Tareas` : 'Tareas');

  if (!courseId) {
    return (
      <div className="px-5 py-8 lg:px-[30px] lg:py-12">
        <EmptyState
          title="Elige un curso para ver sus tareas"
          description="Entra a Tareas desde un curso concreto en “Cursos y módulos”."
          action={
            <Button asChild size="md" className="font-extrabold">
              <Link href={ROUTES.admin.cursos}>Ir a Cursos y módulos</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (isModulesPending) {
    return (
      <div className="flex flex-col gap-2.5 px-5 py-4 lg:px-[30px] lg:py-6">
        <Skeleton className="h-16 rounded-3xl" />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[74px] rounded-4xl" />
        ))}
      </div>
    );
  }

  if (!activeModule) {
    return (
      <div className="px-5 py-8 lg:px-[30px] lg:py-12">
        <EmptyState
          title="Todavía no existe ningún módulo"
          description={`Crea el primer módulo de “${course?.name ?? 'este curso'}” desde el constructor de contenido.`}
        />
      </div>
    );
  }

  const hasModuleRail = Boolean(modules && modules.length > 1);

  return (
    <div className="flex flex-col gap-2.5 pt-4 lg:pt-6">
      <Link
        href={ROUTES.admin.cursos}
        className="mx-5 flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-tiny font-bold text-fg-dim transition-colors hover:bg-surface-sunken hover:text-fg lg:mx-[30px]"
      >
        <ArrowLeft aria-hidden size={14} strokeWidth={2.4} />
        Cursos y módulos
      </Link>

      <div
        className={`grid items-start gap-4 px-5 pb-4 lg:gap-[18px] lg:px-[30px] lg:pb-6 ${
          hasModuleRail ? 'lg:grid-cols-[var(--spacing-rail)_1fr]' : ''
        }`}
      >
        {hasModuleRail && (
          <div className="hidden lg:block">
            <ModuleList
              modules={modules!}
              activeModuleId={selectedModuleId}
              onSelect={(m) => setSelectedModuleId(m.id)}
              onCreate={() => undefined}
            />
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {hasModuleRail && (
            <ChipRow label="Módulos del curso" className="pb-0.5 lg:hidden">
              {modules!.map((m) => (
                <Chip key={m.id} active={m.id === selectedModuleId} onClick={() => setSelectedModuleId(m.id)}>
                  {m.title}
                </Chip>
              ))}
            </ChipRow>
          )}

          <Card radius="md" className="flex items-center justify-between px-[18px] py-3.5">
            <div>
              <h2 className="text-body-lg font-bold text-fg">{activeModule.title}</h2>
              <p className="mt-0.5 text-meta font-semibold text-fg-ghost">
                {course ? `${course.name} · Nivel ${course.level}` : 'Cargando curso…'}
              </p>
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
              <LoadingRegion label="Cargando tareas del módulo" />
              {Array.from({ length: 2 }, (_, i) => (
                <Skeleton key={i} className="h-[74px] rounded-4xl" />
              ))}
            </>
          )}

          {!isAssignmentsPending && assignments && assignments.length === 0 && (
            <EmptyState
              compact
              title="Sin tareas todavía"
              description="Creá la primera tarea para este módulo con el botón de arriba."
            />
          )}

          {!isAssignmentsPending && assignments && assignments.length > 0 && (
            <ol className="flex flex-col gap-2.5">
              {assignments.map((assignment) => {
                const isOpen = assignment.id === openAssignmentId;
                const theseSubmissions = isOpen ? (submissions ?? []) : [];
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
                            submissions={submissions ?? []}
                            onGrade={(submission) => {
                              setGradingSubmission(submission);
                              setFileUrl(null);
                              fileUrlMutation.mutate(submission.mediaKey, {
                                onSuccess: (url) => setFileUrl(url),
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
        </div>
      </div>

      <AssignmentEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        moduleId={moduleId}
        courseId={courseId}
        moduleTitle={activeModule.title}
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
