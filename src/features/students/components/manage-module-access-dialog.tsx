'use client';

import { useEffect, useState } from 'react';

import { useModules } from '@/features/content/hooks/use-content-blocks';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import type { StudentSummary } from '@/types';
import { useModuleAccess, useStudentEnrollments } from '../hooks/use-students';
import { ModuleAccessChecklist } from './module-access-checklist';

export interface ManageModuleAccessDialogProps {
  open: boolean;
  student: StudentSummary | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (courseId: string, moduleIds: string[]) => Promise<unknown>;
  pending?: boolean;
}

/**
 * A diferencia de "Matricular en curso", acá el alumno ya tiene matrícula —
 * sólo se ajusta a qué módulos de un curso ya cursado tiene acceso. Por eso
 * el primer paso elige entre los cursos en los que YA está matriculado, no
 * entre todos los publicados.
 */
export function ManageModuleAccessDialog({
  open,
  student,
  onOpenChange,
  onSubmit,
  pending,
}: ManageModuleAccessDialogProps) {
  const { data: enrollments, isPending: enrollmentsPending } = useStudentEnrollments(student?.id ?? null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<string>>(new Set());
  const { data: modules, isPending: modulesPending } = useModules(selectedCourseId ?? '');
  const { data: currentAccess } = useModuleAccess(student?.id ?? null, selectedCourseId);

  // Se precarga con el acceso YA otorgado — a diferencia de matricular, acá
  // el default no es "todos", sino lo que el alumno ya tiene.
  useEffect(() => {
    if (currentAccess) setSelectedModuleIds(new Set(currentAccess));
  }, [currentAccess]);

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
        <DialogTitle>Dar acceso a módulos</DialogTitle>
        <DialogDescription>Elige el curso y los módulos a los que “{student.name}” debe tener acceso.</DialogDescription>

        <div className="mt-5 flex flex-col gap-2">
          {enrollmentsPending && <p className="text-body-sm font-semibold text-fg-faint">Cargando cursos…</p>}

          {!enrollmentsPending && (!enrollments || enrollments.length === 0) && (
            <EmptyState
              title="Todavía no está matriculado en ningún curso"
              description="Matricula primero al alumno en un curso desde “Matricular en curso”."
            />
          )}

          {enrollments?.map((enrollment) => (
            <button
              key={enrollment.courseId}
              type="button"
              onClick={() => setSelectedCourseId(enrollment.courseId)}
              className={`rounded-2xl border px-4 py-3 text-left text-body-sm font-bold transition-colors ${
                selectedCourseId === enrollment.courseId
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-line text-fg hover:border-line-strong'
              }`}
            >
              {enrollment.courseName}
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
            {pending ? 'Guardando…' : 'Guardar acceso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
