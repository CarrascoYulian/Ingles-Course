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
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AddBlockPanel } from '@/components/admin/add-block-panel';
import { useAdminHeader, useAdminRole } from '@/components/admin/admin-shell';
import { ContentBlockRow } from '@/components/admin/content-block-row';
import { can } from '@/lib/auth/rbac';
import { CreateModuleDialog } from '@/components/admin/create-module-dialog';
import { EditLessonDialog, type EditLessonValues } from '@/components/admin/edit-lesson-dialog';
import { EditModuleDialog, type EditModuleValues } from '@/components/admin/edit-module-dialog';
import { LessonCommentsDialog } from '@/components/admin/lesson-comments-dialog';
import { MediaLibraryDialog } from '@/components/admin/media-library-dialog';
import { ModuleList } from '@/components/admin/module-list';
import { PreviewFileDialog } from '@/components/admin/preview-file-dialog';
import { QuizBlockRow } from '@/components/admin/quiz-block-row';
import { QuizEditorDialog } from '@/components/admin/quiz-editor-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useUndoableDelete } from '@/hooks/use-undoable-delete';
import { useCreateModule } from '@/features/learning/hooks/use-learning';
import { useCourses } from '@/features/courses/hooks/use-courses';
import { ModuleAssignmentsPanel } from '@/features/assignments/components/module-assignments-panel';
import { cn } from '@/lib/utils';
import {
  useAddBlockFromLibrary,
  useAttachUpload,
  useContentBlocks,
  useCourseMedia,
  useDuplicateModule,
  useModules,
  useMoveBlock,
  useOpenFile,
  usePreviewFileUrl,
  useRemoveBlock,
  useRemoveModule,
  useReorderBlock,
  useReorderModule,
  useReplaceLessonMedia,
  useUpdateLesson,
  useUpdateModule,
} from '../hooks/use-content-blocks';
import { useQuizDraft, useRemoveQuiz, useSaveQuizDraft } from '../hooks/use-quiz';
import { UploadDropzone } from './upload-dropzone';

export function ContentView() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId') ?? '';
  // Deep link desde la campana de notificaciones ("Entregas sin calificar")
  // — sólo se usan una vez al cargar, no se vuelven a leer después.
  const initialModuleId = useRef(searchParams.get('moduleId'));
  const initialTareas = useRef(searchParams.get('tab') === 'tareas');

  // Antes esta pantalla resolvía "el" módulo global (`getCurrentModule`) sin
  // importar desde qué curso se llegaba — con más de un curso, todos los
  // docentes terminaban editando el mismo único módulo. Ahora el curso viene
  // de la URL y los módulos se listan filtrados por ese curso.
  const { data: courses } = useCourses();
  const course = courses?.find((c) => c.id === courseId);
  const undoableBlocks = useUndoableDelete();
  const undoableModules = useUndoableDelete();

  const { data: modules, isPending: isModulesPending } = useModules(courseId);
  const [selectedModuleId, setSelectedModuleId] = useState('');

  // `useState('')` sólo lee su valor inicial una vez: cuando los módulos
  // llegan de la red hay que sincronizar la selección a mano.
  const syncedFor = useRef('');
  useEffect(() => {
    if (!modules || syncedFor.current === courseId) return;
    syncedFor.current = courseId;
    const deepLinked = initialModuleId.current;
    setSelectedModuleId(
      (deepLinked && modules.some((m) => m.id === deepLinked) ? deepLinked : modules[0]?.id) ?? '',
    );
  }, [modules, courseId]);

  // Si la unidad seleccionada se borró (o cambió de curso), cae a la
  // primera que quede en vez de dejar la pantalla en "no existe ninguna
  // unidad" con otras unidades todavía disponibles al lado.
  useEffect(() => {
    if (!modules || modules.length === 0) return;
    if (modules.some((m) => m.id === selectedModuleId)) return;
    setSelectedModuleId(modules[0]!.id);
  }, [modules, selectedModuleId]);

  const activeModule = modules?.find((m) => m.id === selectedModuleId);
  const moduleId = activeModule?.id ?? '';

  const contextLine = course
    ? `${course.name} · Nivel ${course.level}${activeModule?.requiresModuleId ? ' · requiere completar la unidad anterior' : ''}`
    : 'Cargando curso…';

  const { data: blocks, isPending } = useContentBlocks(moduleId);
  const visibleBlocks = blocks?.filter((b) => !undoableBlocks.isHidden(b.id));
  const moveBlock = useMoveBlock(moduleId);
  const reorderBlock = useReorderBlock(moduleId);
  const removeBlock = useRemoveBlock(moduleId);
  const role = useAdminRole();
  const canDeleteBlock = can(role, 'content:delete');
  const sensors = useSensors(
    // `activationConstraint` con distancia mínima: sin esto, cualquier click
    // normal en la fila (p. ej. sobre el asa) se interpretaba como el inicio
    // de un arrastre y bloqueaba el click simple.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !visibleBlocks) return;
    const from = visibleBlocks.findIndex((b) => b.id === active.id);
    const to = visibleBlocks.findIndex((b) => b.id === over.id);
    if (from < 0 || to < 0) return;
    reorderBlock.mutate({ blockId: String(active.id), from, to });
  };
  const attachUpload = useAttachUpload(moduleId);
  const openFile = useOpenFile();
  const previewFileUrl = usePreviewFileUrl();
  const updateLesson = useUpdateLesson(moduleId);
  const updateModule = useUpdateModule(courseId);
  const removeModule = useRemoveModule(courseId);
  const reorderModule = useReorderModule(courseId);
  const duplicateModule = useDuplicateModule(courseId);
  const confirmDialog = useConfirmDialog();
  const createModule = useCreateModule();
  const [createModuleOpen, setCreateModuleOpen] = useState(false);
  const [previewBlock, setPreviewBlock] = useState<{ title: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [commentsLessonId, setCommentsLessonId] = useState<string | null>(null);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [assignmentsOpen, setAssignmentsOpen] = useState(initialTareas.current);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const { data: quizDraft } = useQuizDraft(moduleId);
  const saveQuizDraft = useSaveQuizDraft(moduleId);
  const removeQuizDraft = useRemoveQuiz(moduleId);
  const replaceLessonMedia = useReplaceLessonMedia(moduleId);
  const { data: courseMedia, isPending: courseMediaPending } = useCourseMedia(courseId, mediaLibraryOpen);
  const addBlockFromLibrary = useAddBlockFromLibrary(moduleId);

  const toggleBlockSelected = (id: string) =>
    setSelectedBlockIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Cambiar de unidad no debería arrastrar una selección de bloques de la
  // unidad anterior, que ya ni siquiera se muestra.
  useEffect(() => {
    setSelectedBlockIds(new Set());
  }, [moduleId]);

  const openPreview = (block: { title: string; mediaKey: string }) => {
    setPreviewBlock({ title: block.title });
    setPreviewUrl(null);
    previewFileUrl.mutate(block.mediaKey, { onSuccess: (url) => setPreviewUrl(url) });
  };

  // Antes había un botón "Guardar módulo" que sólo mostraba un toast — cada
  // cambio (añadir/mover/eliminar bloque, subir archivo) ya se persiste al
  // instante, así que no existe ningún "borrador" que guardar. Un botón que
  // finge guardar algo que ya está guardado es peor que no tener botón.
  useAdminHeader(
    activeModule ? `${activeModule.title} · ${blocks?.length ?? 0} bloques` : 'Sin unidad',
  );

  const loadingBlocks = isModulesPending || isPending;

  // Sin curso en la URL no hay nada que editar — antes esta pantalla se
  // alcanzaba también desde el menú "Contenido" sin pasar por un curso.
  if (!courseId) {
    return (
      <div className="px-5 py-8 lg:px-[30px] lg:py-12">
        <EmptyState
          title="Elige un curso para editar su contenido"
          description="Entra al constructor de contenido desde un curso concreto en “Cursos y unidades”."
          action={
            <Button asChild size="md" className="font-extrabold">
              <Link href={ROUTES.admin.cursos}>Ir a Cursos y unidades</Link>
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
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[74px] rounded-4xl" />
        ))}
      </div>
    );
  }

  // Antes, sin ningún módulo real, esta pantalla intentaba añadir bloques
  // contra un `module_id` inexistente y fallaba con un error de clave
  // foránea al primer clic — sin explicar por qué, y pedía crear el módulo
  // a mano en el SQL Editor de Supabase. Un docente sin conocimientos
  // técnicos no puede hacer eso, así que ahora hay un formulario real aquí.
  if (!activeModule) {
    return (
      <div className="flex flex-col gap-2.5 pt-4 lg:pt-6">
        <Link
          href={ROUTES.admin.cursos}
          className="mx-5 flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-tiny font-bold text-fg-dim transition-colors hover:bg-surface-sunken hover:text-fg lg:mx-[30px]"
        >
          <ArrowLeft aria-hidden size={14} strokeWidth={2.4} />
          Cursos y unidades
        </Link>
        <div className="px-5 pb-8 lg:px-[30px] lg:pb-12">
        <EmptyState
          title="Todavía no existe ninguna unidad"
          description={`Crea la primera unidad de “${course?.name ?? 'este curso'}” para poder empezar a añadir contenido.`}
          action={
            <Button size="md" className="font-extrabold" onClick={() => setCreateModuleOpen(true)}>
              Crear unidad
            </Button>
          }
        />
        <CreateModuleDialog
          open={createModuleOpen}
          onOpenChange={setCreateModuleOpen}
          courseId={courseId}
          pending={createModule.isPending}
          onSubmit={(values) =>
            createModule.mutateAsync(values).then((created) => {
              setSelectedModuleId(created.id);
            })
          }
        />
        </div>
      </div>
    );
  }

  // El raíl de módulos sólo existe en el DOM cuando hay más de uno que
  // elegir (`hasModuleRail`) — con un solo módulo no tiene sentido
  // mostrarlo. Si el grid siguiera declarando 3 columnas igual, el primer
  // hijo real (el contenido del módulo) caía en la columna angosta pensada
  // para ese raíl que nunca se renderizó, y el panel de "Añadir bloque"
  // heredaba la del medio — el layout se veía roto para cualquier curso de
  // un solo módulo.
  const visibleModules = modules?.filter((m) => !undoableModules.isHidden(m.id));
  const hasModuleRail = Boolean(visibleModules && visibleModules.length > 1);

  return (
    <div className="flex flex-col gap-2.5 pt-4 lg:pt-6">
      <Link
        href={ROUTES.admin.cursos}
        className="mx-5 flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-tiny font-bold text-fg-dim transition-colors hover:bg-surface-sunken hover:text-fg lg:mx-[30px]"
      >
        <ArrowLeft aria-hidden size={14} strokeWidth={2.4} />
        Cursos y unidades
      </Link>

      <div
        className={cn(
          'grid items-start gap-4 px-5 pb-4 lg:gap-[18px] lg:px-[30px] lg:pb-6',
          hasModuleRail
            ? 'lg:grid-cols-[var(--spacing-rail)_1fr_300px]'
            : 'lg:grid-cols-[1fr_300px]',
        )}
      >
      {hasModuleRail && (
        <div className="hidden lg:block">
          <ModuleList
            modules={visibleModules!}
            activeModuleId={selectedModuleId}
            onSelect={(m) => setSelectedModuleId(m.id)}
            onCreate={() => setCreateModuleOpen(true)}
            onRename={(m) => setEditingModuleId(m.id)}
            onReorder={(m, direction) => reorderModule.mutate({ moduleId: m.id, direction })}
            onDuplicate={(m) =>
              duplicateModule.mutateAsync(m.id).then(({ id }) => setSelectedModuleId(id))
            }
            duplicatePending={duplicateModule.isPending}
            canDelete={canDeleteBlock}
            onDelete={(m) =>
              confirmDialog.confirm({
                title: 'Eliminar definitivamente',
                body: `“${m.title}” se eliminará junto con sus bloques, evaluación y tareas — para todos los estudiantes. Vas a tener unos segundos para deshacerlo después.`,
                confirmLabel: 'Sí, eliminar',
                onConfirm: () => {
                  undoableModules.request(m.id, `“${m.title}” eliminada`, () =>
                    removeModule.mutateAsync({ moduleId: m.id, title: m.title }),
                  );
                  if (selectedModuleId === m.id) {
                    setSelectedModuleId(visibleModules!.find((x) => x.id !== m.id)?.id ?? '');
                  }
                },
              })
            }
          />
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-2.5">
        {hasModuleRail && (
          <ChipRow label="Unidades del curso" className="pb-0.5 lg:hidden">
            {visibleModules!.map((m) => (
              <Chip key={m.id} active={m.id === selectedModuleId} onClick={() => setSelectedModuleId(m.id)}>
                {m.title}
              </Chip>
            ))}
          </ChipRow>
        )}

        <Card
          radius="md"
          className="hidden min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-[18px] py-3.5 lg:flex"
        >
          <div className="min-w-[220px] flex-1">
            <h2 className="truncate text-body-lg font-bold text-fg">{activeModule.title}</h2>
            <p className="mt-0.5 truncate text-meta font-semibold text-fg-ghost">{contextLine}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!hasModuleRail && (
              <Button variant="ghost" size="sm" onClick={() => setCreateModuleOpen(true)}>
                + Nueva unidad
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setQuizDialogOpen(true)}>
              {quizDraft ? 'Evaluación de la unidad' : '+ Evaluación'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAssignmentsOpen((open) => !open)}
            >
              {assignmentsOpen ? 'Ocultar tareas' : 'Tareas'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMediaLibraryOpen(true)}>
              Reutilizar archivo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(ROUTES.student.curso, '_blank', 'noopener,noreferrer')}
            >
              Vista previa del alumno
            </Button>
          </div>
        </Card>

        {loadingBlocks && (
          <>
            <LoadingRegion label="Cargando bloques de la unidad" />
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-[74px] rounded-4xl" />
            ))}
          </>
        )}

        {canDeleteBlock && selectedBlockIds.size > 0 && (
          <div className="flex items-center justify-between rounded-4xl bg-accent-tint px-4 py-2.5">
            <p className="text-body-sm font-bold text-accent">
              {selectedBlockIds.size} {selectedBlockIds.size === 1 ? 'bloque seleccionado' : 'bloques seleccionados'}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedBlockIds(new Set())}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  const ids = [...selectedBlockIds];
                  const titles = ids
                    .map((id) => visibleBlocks?.find((b) => b.id === id)?.title)
                    .filter((t): t is string => Boolean(t));
                  confirmDialog.confirm({
                    title: 'Eliminar definitivamente',
                    body: `${ids.length} bloques se eliminarán para todos los estudiantes. Vas a tener unos segundos para deshacerlo después.`,
                    confirmLabel: 'Sí, eliminar',
                    onConfirm: () => {
                      undoableBlocks.requestMany(
                        ids,
                        `${ids.length} bloques eliminados`,
                        (id) =>
                          removeBlock.mutateAsync({
                            id,
                            title: titles[ids.indexOf(id)] ?? '',
                          }),
                      );
                      setSelectedBlockIds(new Set());
                    },
                  });
                }}
              >
                Eliminar seleccionados
              </Button>
            </div>
          </div>
        )}

        <DndContext
          sensors={sensors}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={visibleBlocks?.map((b) => b.id) ?? []}
            strategy={verticalListSortingStrategy}
          >
            <ol className="flex flex-col gap-2.5">
              {visibleBlocks?.map((block, index) => {
                return (
                <ContentBlockRow
                  key={block.id}
                  block={block}
                  index={index}
                  total={visibleBlocks.length}
                  onMove={(direction) => moveBlock.mutate({ blockId: block.id, direction })}
                  onDelete={
                    canDeleteBlock
                      ? () =>
                          confirmDialog.confirm({
                            title: 'Eliminar definitivamente',
                            body: `“${block.title}” se eliminará para todos los estudiantes. Vas a tener unos segundos para deshacerlo después.`,
                            confirmLabel: 'Sí, eliminar',
                            onConfirm: () =>
                              undoableBlocks.request(block.id, `“${block.title}” eliminado`, () =>
                                removeBlock.mutateAsync({ id: block.id, title: block.title }),
                              ),
                          })
                      : undefined
                  }
                  onOpenFile={block.mediaKey ? () => openFile.mutate(block.mediaKey!) : undefined}
                  openFilePending={openFile.isPending}
                  onPreview={
                    block.mediaKey
                      ? () => openPreview({ title: block.title, mediaKey: block.mediaKey! })
                      : undefined
                  }
                  onEditLesson={block.mediaKey ? () => setEditingLessonId(block.id) : undefined}
                  onComments={block.mediaKey ? () => setCommentsLessonId(block.id) : undefined}
                  onReplace={
                    block.mediaKey
                      ? {
                          courseId,
                          moduleId,
                          onReplaced: (result) =>
                            replaceLessonMedia.mutateAsync({ lessonId: block.id, ...result }),
                        }
                      : undefined
                  }
                  selected={canDeleteBlock ? selectedBlockIds.has(block.id) : undefined}
                  onToggleSelect={canDeleteBlock ? () => toggleBlockSelected(block.id) : undefined}
                />
                );
              })}
              {quizDraft && (
                <QuizBlockRow
                  draft={quizDraft}
                  index={blocks?.length ?? 0}
                  onEdit={() => setQuizDialogOpen(true)}
                />
              )}
            </ol>
          </SortableContext>
        </DndContext>

        {blocks && blocks.length === 0 && !isPending && !quizDraft && (
          <EmptyState
            compact
            title="Sin bloques todavía"
            description="Añade el primer bloque desde el panel de la derecha o suelta un archivo aquí abajo."
          />
        )}

        <UploadDropzone
          courseId={courseId}
          moduleId={moduleId}
          onUploaded={(result) =>
            attachUpload.mutateAsync({ moduleId, ...result }).then(() => undefined)
          }
          className="hidden lg:block"
        />

        {assignmentsOpen && (
          <ModuleAssignmentsPanel moduleId={moduleId} moduleTitle={activeModule.title} courseId={courseId} />
        )}

      </div>

      <AddBlockPanel />

      <CreateModuleDialog
        open={createModuleOpen}
        onOpenChange={setCreateModuleOpen}
        courseId={courseId}
        pending={createModule.isPending}
        onSubmit={(values) =>
          createModule.mutateAsync(values).then((created) => {
            setSelectedModuleId(created.id);
          })
        }
      />

      <ConfirmDialog
        request={confirmDialog.request}
        open={confirmDialog.isOpen}
        pending={confirmDialog.pending}
        onCancel={confirmDialog.dismiss}
        onConfirm={confirmDialog.accept}
      />

      <PreviewFileDialog
        open={previewBlock !== null}
        onOpenChange={(open) => !open && setPreviewBlock(null)}
        title={previewBlock?.title ?? ''}
        fileName={previewBlock?.title ?? ''}
        url={previewUrl}
        loading={previewFileUrl.isPending}
      />

      <EditLessonDialog
        open={editingLessonId !== null}
        onOpenChange={(open) => !open && setEditingLessonId(null)}
        pending={updateLesson.isPending}
        initialValues={
          editingLessonId
            ? (() => {
                const block = blocks?.find((b) => b.id === editingLessonId);
                return block
                  ? { title: block.title, description: block.description ?? '', transcript: block.transcript ?? '' }
                  : null;
              })()
            : null
        }
        onSubmit={(values: EditLessonValues) => {
          if (!editingLessonId) return Promise.resolve();
          return updateLesson.mutateAsync({ lessonId: editingLessonId, ...values });
        }}
      />

      <EditModuleDialog
        open={editingModuleId !== null}
        onOpenChange={(open) => !open && setEditingModuleId(null)}
        pending={updateModule.isPending}
        otherModules={modules?.filter((m) => m.id !== editingModuleId) ?? []}
        initialValues={
          editingModuleId
            ? (() => {
                const target = modules?.find((m) => m.id === editingModuleId);
                return target ? { title: target.title, requiresModuleId: target.requiresModuleId } : null;
              })()
            : null
        }
        onSubmit={(values: EditModuleValues) => {
          if (!editingModuleId) return Promise.resolve();
          return updateModule.mutateAsync({ moduleId: editingModuleId, ...values });
        }}
      />

      <MediaLibraryDialog
        open={mediaLibraryOpen}
        onOpenChange={setMediaLibraryOpen}
        items={courseMedia?.filter((item) => !visibleBlocks?.some((b) => b.id === item.lessonId))}
        loading={courseMediaPending}
        usePending={addBlockFromLibrary.isPending}
        onUse={(item) =>
          addBlockFromLibrary.mutateAsync(item.lessonId).then(() => setMediaLibraryOpen(false))
        }
      />

      <LessonCommentsDialog
        open={commentsLessonId !== null}
        onOpenChange={(open) => !open && setCommentsLessonId(null)}
        lessonId={commentsLessonId}
        lessonTitle={blocks?.find((b) => b.id === commentsLessonId)?.title ?? 'esta lección'}
      />

      <QuizEditorDialog
        open={quizDialogOpen}
        onOpenChange={setQuizDialogOpen}
        moduleTitle={activeModule.title}
        draft={quizDraft}
        pending={saveQuizDraft.isPending}
        removePending={removeQuizDraft.isPending}
        canRemove={canDeleteBlock}
        onSave={(draft) => saveQuizDraft.mutate(draft, { onSuccess: () => setQuizDialogOpen(false) })}
        onRemove={() =>
          confirmDialog.confirm({
            title: 'Eliminar la evaluación de la unidad',
            body: `Se borrará el quiz de “${activeModule.title}” y todos los intentos de los alumnos. Esta acción no se puede deshacer.`,
            confirmLabel: 'Sí, eliminar',
            onConfirm: () => removeQuizDraft.mutateAsync().then(() => setQuizDialogOpen(false)),
          })
        }
      />
      </div>
    </div>
  );
}
