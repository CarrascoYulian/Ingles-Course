'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { AssignmentSubmission } from '@/types';

export interface GradeSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: AssignmentSubmission | null;
  fileUrl: string | null;
  urlPending: boolean;
  pending?: boolean;
  onGrade: (grade: number, feedback: string) => void;
}

export function GradeSubmissionDialog({
  open,
  onOpenChange,
  submission,
  fileUrl,
  urlPending,
  pending,
  onGrade,
}: GradeSubmissionDialogProps) {
  const [grade, setGrade] = useState(0);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!open || !submission) return;
    setGrade(submission.grade ?? 0);
    setFeedback(submission.feedback ?? '');
  }, [open, submission]);

  if (!submission) return null;

  const handleSave = () => {
    if (grade < 0 || grade > 100) {
      toast.error('La nota debe estar entre 0 y 100');
      return;
    }
    onGrade(grade, feedback);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={460}>
        <DialogTitle>Calificar entrega</DialogTitle>
        <DialogDescription>{submission.studentName ?? 'Alumno'}</DialogDescription>

        <div className="mt-4 flex flex-col gap-4">
          {urlPending ? (
            <p className="text-body-sm text-fg-ghost">Cargando el archivo…</p>
          ) : fileUrl ? (
            submission.kind === 'audio' ? (
              <audio src={fileUrl} controls className="w-full" />
            ) : (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate rounded-2xl border border-line bg-surface-muted px-3.5 py-2.5 text-body-sm font-semibold text-brand hover:underline"
              >
                {submission.fileName}
              </a>
            )
          ) : (
            <p className="text-body-sm text-danger-strong">No se pudo cargar el archivo.</p>
          )}

          <Field label="Nota (0-100)" className="max-w-[140px]">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="number"
                min={0}
                max={100}
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
              />
            )}
          </Field>

          <Field label="Comentario">
            {(fieldProps) => (
              <Textarea {...fieldProps} rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
            )}
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="md" className="font-extrabold" disabled={pending} onClick={handleSave}>
            {pending ? 'Guardando…' : 'Guardar calificación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
