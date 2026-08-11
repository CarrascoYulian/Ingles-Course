'use client';

import { useState } from 'react';

import { useCourses } from '@/features/courses/hooks/use-courses';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import type { StudentSummary } from '@/types';

export interface EnrollStudentDialogProps {
  open: boolean;
  student: StudentSummary | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (courseId: string) => Promise<unknown>;
  pending?: boolean;
}

/**
 * Crear un estudiante no lo matricula en ningún curso — "Mi curso" se queda
 * vacío hasta que el maestro lo matricule explícitamente aquí.
 */
export function EnrollStudentDialog({ open, student, onOpenChange, onSubmit, pending }: EnrollStudentDialogProps) {
  const { data: courses, isPending: coursesPending } = useCourses();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const publishedCourses = courses?.filter((c) => c.published) ?? [];

  if (!student) return null;

  const submit = async () => {
    if (!selectedCourseId) return;
    await onSubmit(selectedCourseId);
    setSelectedCourseId(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSelectedCourseId(null);
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
              description="Publica un curso desde “Cursos y módulos” antes de matricular estudiantes."
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

        <DialogFooter>
          <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="md"
            className="font-extrabold"
            disabled={pending || !selectedCourseId}
            onClick={submit}
          >
            {pending ? 'Matriculando…' : 'Matricular'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
