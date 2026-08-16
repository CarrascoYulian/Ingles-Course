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
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { AddBlockPanel } from '@/components/admin/add-block-panel';
import { useAdminHeader, useAdminRole } from '@/components/admin/admin-shell';
import { ContentBlockRow } from '@/components/admin/content-block-row';
import { can } from '@/lib/auth/rbac';
import { CreateModuleDialog } from '@/components/admin/create-module-dialog';
import { EditLessonDialog, type EditLessonValues } from '@/components/admin/edit-lesson-dialog';
import { LessonCommentsDialog } from '@/components/admin/lesson-comments-dialog';
import { ModuleList } from '@/components/admin/module-list';
import { PreviewFileDialog } from '@/components/admin/preview-file-dialog';
import { QuizEditorDialog } from '@/components/admin/quiz-editor-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useCreateModule } from '@/features/learning/hooks/use-learning';
import { useCourses } from '@/features/courses/hooks/use-courses';
import { cn } from '@/lib/utils';
import {
  useAddBlock,
  useAttachUpload,
  useContentBlocks,
  useModuleLessons,
  useModules,
  useMoveBlock,
  useOpenFile,
  usePreviewFileUrl,
  useRemoveBlock,
  useReorderBlock,
  useUpdateLesson,
} from '../hooks/use-content-blocks';
import { useQuizDraft, useRemoveQuiz, useSaveQuizDraft } from '../hooks/use-quiz';
import { UploadDropzone } from './upload-dropzone';

export function ContentView() {
  const courseId = useSearchParams().get('courseId') ?? '';

  // Antes esta pantalla resolvía "el" módulo global (`getCurrentModule`) sin
  // importar desde qué curso se llegaba — con más de un curso, todos los
  // docentes terminaban editando el mismo único módulo. Ahora el curso viene
  // de la URL y los módulos se listan filtrados por ese curso.
  const { data: courses } = useCourses();
  const course = courses?.find((c) => c.id === courseId);

  const { data: modules, isPending: isModulesPending } = useModules(courseId);
  const [selectedModuleId, setSelectedModuleId] = useState('');

  // `useState('')` sólo lee su valor inicial una vez: cuando los módulos
  // llegan de la red hay que sincronizar la selección a mano.
  const syncedFor = useRef('');
  useEffect(() => {
    if (!modules || syncedFor.current === courseId) return;
    syncedFor.current = courseId;
    setSelectedModuleId(modules[0]?.id ?? '');
  }, [modules, courseId]);

  const activeModule = modules?.find((m) => m.id === selectedModuleId);
  const moduleId = activeModule?.id ?? '';

  const contextLine = course
    ? `${course.name} · Nivel ${course.level}${activeModule?.requiresModuleId ? ' · requiere completar el módulo anterior' : ''}`
    : 'Cargando curso…';

  const { data: blocks, isPending } = useContentBlocks(moduleId);
  const { data: moduleLessons } = useModuleLessons(moduleId);
  const addBlock = useAddBlock(moduleId);
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
    if (!over || active.id === over.id || !blocks) return;
    const from = blocks.findIndex((b) => b.id === active.id);
    const to = blocks.findIndex((b) => b.id === over.id);
    if (from < 0 || to < 0) return;
    reorderBlock.mutate({ blockId: String(active.id), from, to });
  };
  const attachUpload = useAttachUpload(moduleId);
  const openFile = useOpenFile();
  const previewFileUrl = usePreviewFileUrl();
  const updateLesson = useUpdateLesson(moduleId);
  const confirmDialog = useConfirmDialog();
  const createModule = useCreateModule();
  const [createModuleOpen, setCreateModuleOpen] = useState(false);
  const [previewBlock, setPreviewBlock] = useState<{ title: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [commentsLessonId, setCommentsLessonId] = useState<string | null>(null);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const { data: quizDraft } = useQuizDraft(moduleId);
  const saveQuizDraft = useSaveQuizDraft(moduleId);
  const removeQuizDraft = useRemoveQuiz(moduleId);

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
    activeModule ? `${activeModule.title} · ${blocks?.length ?? 0} bloques` : 'Sin módulo',
  );

  const loadingBlocks = isModulesPending || isPending;

  // Sin curso en la URL no hay nada que editar — antes esta pantalla se
  // alcanzaba también desde el menú "Contenido" sin pasar por un curso.
  if (!courseId) {
    return (
      <div className="px-5 py-8 lg:px-[30px] lg:py-12">
        <EmptyState
          title="Elige un curso para editar su contenido"
          description="Entra al constructor de contenido desde un curso concreto en “Cursos y módulos”."
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
      <div className="px-5 py-8 lg:px-[30px] lg:py-12">
        <EmptyState
          title="Todavía no existe ningún módulo"
          description={`Crea el primer módulo de “${course?.name ?? 'este curso'}” para poder empezar a añadir contenido.`}
          action={
            <Button size="md" className="font-extrabold" onClick={() => setCreateModuleOpen(true)}>
              Crear módulo
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
    );
  }

  // El raíl de módulos sólo existe en el DOM cuando hay más de uno que
  // elegir (`hasModuleRail`) — con un solo módulo no tiene sentido
  // mostrarlo. Si el grid siguiera declarando 3 columnas igual, el primer
  // hijo real (el contenido del módulo) caía en la columna angosta pensada
  // para ese raíl que nunca se renderizó, y el panel de "Añadir bloque"
  // heredaba la del medio — el layout se veía roto para cualquier curso de
  // un solo módulo.
  const hasModuleRail = Boolean(modules && modules.length > 1);

  return (
    <div
      className={cn(
        'grid items-start gap-4 px-5 py-4 lg:gap-[18px] lg:px-[30px] lg:py-6',
        hasModuleRail
          ? 'lg:grid-cols-[var(--spacing-rail)_1fr_300px]'
          : 'lg:grid-cols-[1fr_300px]',
      )}
    >
      {hasModuleRail && (
        <div className="hidden lg:block">
          <ModuleList
            modules={modules!}
            activeModuleId={selectedModuleId}
            onSelect={(m) => setSelectedModuleId(m.id)}
            onCreate={() => setCreateModuleOpen(true)}
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

        <Card
          radius="md"
          className="hidden items-center justify-between px-[18px] py-3.5 lg:flex"
        >
          <div>
            <h2 className="text-body-lg font-bold text-fg">{activeModule.title}</h2>
            <p className="mt-0.5 text-meta font-semibold text-fg-ghost">{contextLine}</p>
          </div>
          <div className="flex items-center gap-2">
            {!hasModuleRail && (
              <Button variant="ghost" size="sm" onClick={() => setCreateModuleOpen(true)}>
                + Nuevo módulo
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setQuizDialogOpen(true)}>
              {quizDraft ? 'Evaluación del módulo' : '+ Evaluación'}
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
            <LoadingRegion label="Cargando bloques del módulo" />
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-[74px] rounded-4xl" />
            ))}
          </>
        )}

        <DndContext
          sensors={sensors}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks?.map((b) => b.id) ?? []}
            strategy={verticalListSortingStrategy}
          >
            <ol className="flex flex-col gap-2.5">
              {blocks?.map((block, index) => {
                return (
                <ContentBlockRow
                  key={block.id}
                  block={block}
                  index={index}
                  total={blocks.length}
                  onMove={(direction) => moveBlock.mutate({ blockId: block.id, direction })}
                  onDelete={
                    canDeleteBlock
                      ? () =>
                          confirmDialog.confirm({
                            title: 'Eliminar definitivamente',
                            body: `“${block.title}” se eliminará para todos los estudiantes. Esta acción no se puede deshacer.`,
                            confirmLabel: 'Sí, eliminar',
                            onConfirm: () => removeBlock.mutateAsync({ id: block.id, title: block.title }),
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
                  onEditLesson={
                    block.type === 'Video' && block.mediaKey
                      ? () => {
                          const lesson = moduleLessons?.find((l) => l.mediaKey === block.mediaKey);
                          if (lesson) setEditingLessonId(lesson.id);
                          else toast.error('Todavía no se generó la lección de este video. Recarga la página.');
                        }
                      : undefined
                  }
                  onComments={
                    block.type === 'Video' && block.mediaKey
                      ? () => {
                          const lesson = moduleLessons?.find((l) => l.mediaKey === block.mediaKey);
                          if (lesson) setCommentsLessonId(lesson.id);
                          else toast.error('Todavía no se generó la lección de este video. Recarga la página.');
                        }
                      : undefined
                  }
                />
                );
              })}
            </ol>
          </SortableContext>
        </DndContext>

        {blocks && blocks.length === 0 && !isPending && (
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

        <div className="lg:hidden">
          <AddBlockPanel onAdd={(type) => addBlock.mutate(type)} pending={addBlock.isPending} />
        </div>
      </div>

      <AddBlockPanel onAdd={(type) => addBlock.mutate(type)} pending={addBlock.isPending} />

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
                const lesson = moduleLessons?.find((l) => l.id === editingLessonId);
                return lesson ? { title: lesson.title, description: lesson.description ?? '' } : null;
              })()
            : null
        }
        onSubmit={(values: EditLessonValues) => {
          if (!editingLessonId) return Promise.resolve();
          return updateLesson.mutateAsync({ lessonId: editingLessonId, ...values });
        }}
      />

      <LessonCommentsDialog
        open={commentsLessonId !== null}
        onOpenChange={(open) => !open && setCommentsLessonId(null)}
        lessonId={commentsLessonId}
        lessonTitle={
          moduleLessons?.find((l) => l.id === commentsLessonId)?.title ?? 'esta lección'
        }
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
            title: 'Eliminar la evaluación del módulo',
            body: `Se borrará el quiz de “${activeModule.title}” y todos los intentos de los alumnos. Esta acción no se puede deshacer.`,
            confirmLabel: 'Sí, eliminar',
            onConfirm: () => removeQuizDraft.mutateAsync().then(() => setQuizDialogOpen(false)),
          })
        }
      />
    </div>
  );
}
