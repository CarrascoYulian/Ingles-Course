'use client';

import { ArrowLeft, ChevronRight, Layers } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { LEVEL_BADGE } from '@/constants/palettes';
import { ROUTES } from '@/constants/routes';
import { useCourses } from '@/features/courses/hooks/use-courses';
import { useModules } from '@/features/content/hooks/use-content-blocks';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { backend } from '@/services';
import { useMutation } from '@tanstack/react-query';
import type { AssignmentSubmission } from '@/types';
import {
  useAssignments,
  useCreateAssignment,
  useGradeSubmission,
  useModuleSubmissions,
  useRemoveAssignment,
  useUpdateAssignment,
} from '../hooks/use-assignments';

/**
 * Selector de curso propio de Tareas — antes esta pantalla, sin `courseId`
 * en la URL, mandaba al docente afuera de la sección ("Ir a Cursos y
 * módulos") sin ninguna forma de volver con una tarea armada; el docente
 * terminaba en una pantalla de gestión de cursos sin ningún botón de
 * "tarea". Ahora elegir el curso pasa por acá mismo, nunca sale de Tareas.
 */
function CoursePicker() {
  const router = useRouter();
  const { data: courses, isPending } = useCourses();

  if (isPending) {
    return (
      <div className="flex flex-col gap-2.5 px-5 py-4 lg:px-[30px] lg:py-6">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-3xl" />
        ))}
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="px-5 py-8 lg:px-[30px] lg:py-12">
        <EmptyState
          title="Todavía no hay cursos"
          description="Crea un curso primero desde “Cursos y módulos” para poder asignarle tareas."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-5 py-6 lg:px-[30px]">
      <h1 className="text-title-lg font-extrabold text-fg">Tareas</h1>
      <p className="-mt-1 text-body-sm font-semibold text-fg-ghost">
        Elige el curso para ver o crear sus tareas
      </p>

      <div className="flex flex-col gap-2">
        {courses.map((course) => (
          <button
            key={course.id}
            type="button"
            onClick={() => router.push(ROUTES.admin.tareasDeCurso(course.id))}
            className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-4 text-left transition-colors duration-[160ms] hover:border-fg-placeholder"
          >
            <span
              className={`grid size-11 shrink-0 place-items-center rounded-2xl text-tiny font-extrabold ${LEVEL_BADGE[course.level]}`}
            >
              {course.level}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body font-bold text-fg">{course.name}</span>
              <span className="mt-0.5 flex items-center gap-1 text-tiny font-semibold text-fg-ghost">
                <Layers aria-hidden size={11} strokeWidth={2.4} />
                {course.modules} {course.modules === 1 ? 'módulo' : 'módulos'}
                {!course.published && ' · Borrador'}
              </span>
            </span>
            <ChevronRight aria-hidden size={16} strokeWidth={2.4} className="shrink-0 text-fg-faint" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function AssignmentsAdminView() {
  const router = useRouter();
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

  // Un solo `useAdminHeader` para toda la pantalla — antes `CoursePicker`
  // tenía su propia llamada, y como React confirma los efectos del hijo
  // antes que los del padre, el título más específico ("Elige un curso")
  // quedaba pisado por el genérico "Tareas" del padre en cada render.
  useAdminHeader(!courseId ? 'Elige un curso' : activeModule ? `${activeModule.title} · Tareas` : 'Tareas');

  if (!courseId) {
    return <CoursePicker />;
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
          description={`“${course?.name ?? 'Este curso'}” todavía no tiene módulos — creá el primero desde el constructor de contenido para poder asignarle tareas.`}
          action={
            <Button
              size="md"
              className="font-extrabold"
              onClick={() => router.push(ROUTES.admin.contenidoDeCurso(courseId))}
            >
              Ir al constructor de contenido
            </Button>
          }
        />
      </div>
    );
  }

  const hasModuleRail = Boolean(modules && modules.length > 1);

  return (
    <div className="flex flex-col gap-2.5 pt-4 lg:pt-6">
      <button
        type="button"
        onClick={() => router.push(ROUTES.admin.tareas)}
        className="mx-5 flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-tiny font-bold text-fg-dim transition-colors hover:bg-surface-sunken hover:text-fg lg:mx-[30px]"
      >
        <ArrowLeft aria-hidden size={14} strokeWidth={2.4} />
        Cambiar de curso
      </button>

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
