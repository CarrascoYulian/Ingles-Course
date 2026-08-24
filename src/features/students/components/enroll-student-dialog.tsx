'use client';

import { useEffect, useState } from 'react';

import { useCourses } from '@/features/courses/hooks/use-courses';
import { useModules } from '@/features/content/hooks/use-content-blocks';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import type { StudentSummary } from '@/types';
import { ModuleAccessChecklist } from './module-access-checklist';

export interface EnrollStudentDialogProps {
  open: boolean;
  student: StudentSummary | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (courseId: string, moduleIds: string[]) => Promise<unknown>;
  pending?: boolean;
}

/**
 * Crear un estudiante no lo matricula en ningún curso — "Mi curso" se queda
 * vacío hasta que el maestro lo matricule explícitamente aquí. Matricular
 * además exige elegir a qué módulos del curso tiene acceso — nunca ninguno,
 * o el alumno queda matriculado sin nada que ver.
 */
export function EnrollStudentDialog({ open, student, onOpenChange, onSubmit, pending }: EnrollStudentDialogProps) {
  const { data: courses, isPending: coursesPending } = useCourses();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<string>>(new Set());
  const publishedCourses = courses?.filter((c) => c.published) ?? [];
  const { data: modules, isPending: modulesPending } = useModules(selectedCourseId ?? '');

  // Al elegir el curso, el default es acceso a todos sus módulos — mantiene
  // el comportamiento de siempre (matrícula = acceso total); el maestro
  // desmarca si quiere limitar desde el arranque.
  useEffect(() => {
    if (modules) setSelectedModuleIds(new Set(modules.map((m) => m.id)));
  }, [modules]);

  if (!student) return null;

  const reset = () => {
    setSelectedCourseId(null);
    setSelectedModuleIds(new Set());
  };

  const submit = async () => {
    if (!selectedCourseId || selectedModuleIds.size === 0) return;
    await onSubmit(selectedCourseId, Array.from(selectedModuleIds));
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent width={420}>
        <DialogTitle>Matricular en curso</DialogTitle>
        <DialogDescription>Elige el curso en el que quieres matricular a “{student.name}”.</DialogDescription>

        <div className="mt-5 flex flex-col gap-2">
          {coursesPending && <p className="text-body-sm font-semibold text-fg-faint">Cargando cursos…</p>}

          {!coursesPending && publishedCourses.length === 0 && (
            <EmptyState
              title="No hay cursos publicados"
              description="Publica un curso desde “Cursos y unidades” antes de matricular estudiantes."
            />
          )}

          {publishedCourses.map((course) => (
            <button
              key={course.id}
              type="button"
              onClick={() => setSelectedCourseId(course.id)}
              className={`rounded-2xl border px-4 py-3 text-left text-body-sm font-bold transition-colors ${
                selectedCourseId === course.id
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-line text-fg hover:border-line-strong'
              }`}
            >
              {course.name}
              <span className="ml-2 font-semibold text-fg-ghost">Nivel {course.level}</span>
            </button>
          ))}
        </div>

        {selectedCourseId && (
          <div className="mt-4 border-t border-line pt-4">
            <ModuleAccessChecklist
              modules={modules}
              modulesPending={modulesPending}
              selectedModuleIds={selectedModuleIds}
              onChange={setSelectedModuleIds}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="md"
            className="font-extrabold"
            disabled={pending || !selectedCourseId || selectedModuleIds.size === 0}
            onClick={submit}
          >
            {pending ? 'Matriculando…' : 'Matricular'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
