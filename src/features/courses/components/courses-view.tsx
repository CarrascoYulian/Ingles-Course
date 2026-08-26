'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAdminHeader } from '@/components/admin/admin-shell';
import { CourseCard } from '@/components/admin/course-card';
import { CourseRatingsDialog } from '@/components/admin/course-ratings-dialog';
import { CreateCourseDialog } from '@/components/admin/create-course-dialog';
import { EditCourseDialog } from '@/components/admin/edit-course-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton, LoadingRegion } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useUndoableDelete } from '@/hooks/use-undoable-delete';
import { useAdminSearch } from '@/features/students/hooks/use-admin-search';
import { CEFR_LEVELS, type CefrLevel, type Course } from '@/types';
import {
  useCourses,
  useCreateCourse,
  useDeleteCourse,
  usePublishWarnings,
  useReorderCourse,
  useTogglePublished,
  useUpdateCourse,
} from '../hooks/use-courses';

const LEVEL_FILTERS: Array<CefrLevel | 'Todos'> = ['Todos', ...CEFR_LEVELS];

export function CoursesView() {
  const router = useRouter();
  const [levelFilter, setLevelFilter] = useState<CefrLevel | 'Todos'>('Todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [ratingsCourse, setRatingsCourse] = useState<Course | null>(null);

  const { appliedQuery } = useAdminSearch();
  const { data: courses, isPending } = useCourses();
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const togglePublished = useTogglePublished();
  const deleteCourse = useDeleteCourse();
  const reorderCourse = useReorderCourse();
  const publishWarnings = usePublishWarnings();
  const confirmDialog = useConfirmDialog();
  const undoableCourses = useUndoableDelete();

  /**
   * Publicar es irreversible en la práctica (el curso queda visible para
   * alumnos matriculados de inmediato) — antes de hacerlo, se avisa si
   * alguna unidad quedaría vacía o sin evaluación, pero no se bloquea: el
   * docente puede seguir publicando igual (p. ej. un curso sólo de lectura
   * sin evaluación es válido).
   */
  const handleTogglePublish = async (target: Course) => {
    if (target.published) {
      togglePublished.mutate({ id: target.id, published: false });
      return;
    }

    const warnings = await publishWarnings.mutateAsync(target.id).catch(() => []);
    if (warnings.length === 0) {
      togglePublished.mutate({ id: target.id, published: true });
      return;
    }

    const detail = warnings
      .map((w) => `“${w.title}” (${[w.empty && 'sin bloques', w.missingQuiz && 'sin evaluación'].filter(Boolean).join(' y ')})`)
      .join(', ');

    confirmDialog.confirm({
      title: 'Publicar con unidades incompletas',
      body: `${warnings.length === 1 ? 'Esta unidad quedaría' : `Estas ${warnings.length} unidades quedarían`} visible para los alumnos así: ${detail}. Podés publicar igual y completarlas después.`,
      confirmLabel: 'Publicar de todos modos',
      onConfirm: () => togglePublished.mutateAsync({ id: target.id, published: true }).then(() => undefined),
    });
  };

  useAdminHeader(
    courses
      ? `${courses.length} cursos · ${courses.filter((c) => c.published).length} publicados`
      : 'Cargando cursos…',
    () => setDialogOpen(true),
  );

  const needle = appliedQuery.trim().toLocaleLowerCase();
  const visible = courses?.filter(
    (course) =>
      !undoableCourses.isHidden(course.id) &&
      (levelFilter === 'Todos' || course.level === levelFilter) &&
      (needle === '' || course.name.toLocaleLowerCase().includes(needle)),
  );

  return (
    <div className="flex flex-col gap-3 px-5 py-4 lg:gap-3.5 lg:px-[30px] lg:py-6">
      <div className="flex items-center justify-between gap-4">
        <ChipRow label="Filtrar por nivel">
          {LEVEL_FILTERS.map((level) => (
            <Chip
              key={level}
              active={levelFilter === level}
              onClick={() => setLevelFilter(level)}
            >
              {level}
            </Chip>
          ))}
        </ChipRow>
        <p className="hidden shrink-0 text-meta font-bold text-fg-ghost xl:block">
          Usa las flechas para reordenar · toca un curso para editar sus unidades
        </p>
      </div>

      {isPending && (
        <>
          <LoadingRegion label="Cargando cursos" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-6xl" />
          ))}
        </>
      )}

      {visible?.length === 0 && (
        <EmptyState
          title="No hay cursos en este nivel"
          description="Cambia el filtro o crea un curso nuevo para empezar."
          action={
            <Button size="md" onClick={() => setDialogOpen(true)}>
              Crear un curso nuevo
            </Button>
          }
        />
      )}

      {visible?.map((course, index) => (
        <CourseCard
          key={course.id}
          course={course}
          pending={togglePublished.isPending || deleteCourse.isPending || publishWarnings.isPending}
          onToggle={(target) => void handleTogglePublish(target)}
          onEdit={() => router.push(ROUTES.admin.contenidoDeCurso(course.id))}
          onRename={setEditingCourse}
          onViewRatings={setRatingsCourse}
          onReorder={(target, direction) => reorderCourse.mutate({ id: target.id, direction })}
          // El orden real es global (`position`); con un filtro de nivel
          // activo, el vecino visible no es necesariamente el vecino real
          // — se deshabilita el reordenamiento para no confundir.
          isFirst={levelFilter !== 'Todos' || index === 0}
          isLast={levelFilter !== 'Todos' || index === visible.length - 1}
          onDelete={(target) =>
            confirmDialog.confirm({
              title: 'Eliminar definitivamente',
              body: `“${target.name}” se eliminará para todos los estudiantes. Vas a tener unos segundos para deshacerlo después.`,
              confirmLabel: 'Sí, eliminar',
              onConfirm: () =>
                undoableCourses.request(target.id, `“${target.name}” eliminado`, () =>
                  deleteCourse.mutateAsync({ id: target.id, name: target.name }),
                ),
            })
          }
        />
      ))}

      {!isPending && (
        <Button variant="dashed" size="drop" onClick={() => setDialogOpen(true)}>
          + Crear un curso nuevo
        </Button>
      )}

      <CreateCourseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(values) => createCourse.mutateAsync(values).then(() => undefined)}
        pending={createCourse.isPending}
      />

      <EditCourseDialog
        course={editingCourse}
        onOpenChange={(open) => !open && setEditingCourse(null)}
        pending={updateCourse.isPending}
        onSubmit={(values) =>
          updateCourse.mutateAsync({ id: editingCourse!.id, input: values }).then(() => undefined)
        }
      />

      <ConfirmDialog
        request={confirmDialog.request}
        open={confirmDialog.isOpen}
        pending={confirmDialog.pending}
        onCancel={confirmDialog.dismiss}
        onConfirm={confirmDialog.accept}
      />

      <CourseRatingsDialog
        open={ratingsCourse !== null}
        onOpenChange={(open) => !open && setRatingsCourse(null)}
        courseId={ratingsCourse?.id ?? null}
        courseName={ratingsCourse?.name ?? null}
      />
    </div>
  );
}
