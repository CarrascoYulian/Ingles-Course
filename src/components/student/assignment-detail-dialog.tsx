'use client';

import { Paperclip } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { UploadDropzone } from '@/features/content/components/upload-dropzone';
import { AudioRecorder } from '@/features/assignments/components/audio-recorder';
import { uploadFile } from '@/features/content/upload';
import { canStudentDelete, canStudentSubmit } from '@/features/assignments/submission-rules';
import type { Assignment, AssignmentSubmission } from '@/types';

export interface AssignmentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: Assignment | null;
  courseId: string;
  submission: AssignmentSubmission | null | undefined;
  attachmentUrl: string | null;
  submissionUrl: string | null;
  submitPending?: boolean;
  deletePending?: boolean;
  onSubmit: (input: { kind: 'file' | 'audio'; mediaKey: string; fileName: string }) => void;
  onDelete: (submissionId: string) => void;
}

type Mode = 'choose' | 'file' | 'audio';

export function AssignmentDetailDialog({
  open,
  onOpenChange,
  assignment,
  courseId,
  submission,
  attachmentUrl,
  submissionUrl,
  submitPending,
  deletePending,
  onSubmit,
  onDelete,
}: AssignmentDetailDialogProps) {
  const [mode, setMode] = useState<Mode>('choose');

  if (!assignment) return null;

  const now = new Date();
  const canSubmit = canStudentSubmit({ dueAt: assignment.dueAt, gradedAt: submission?.gradedAt ?? null }, now);
  const canDelete = submission
    ? canStudentDelete({ dueAt: assignment.dueAt, gradedAt: submission.gradedAt }, now)
    : false;

  const dueLabel = new Date(assignment.dueAt).toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setMode('choose');
        onOpenChange(next);
      }}
    >
      <DialogContent width={460}>
        <DialogTitle>{assignment.title}</DialogTitle>
        <DialogDescription>Vence {dueLabel}</DialogDescription>

        <div className="mt-4 flex flex-col gap-4">
          <p className="whitespace-pre-wrap text-body-sm text-fg-soft">{assignment.instructions}</p>

          {assignment.mediaKey && (
            <a
              href={attachmentUrl ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-2xl border border-line bg-surface-muted px-3.5 py-2.5 text-body-sm font-semibold text-brand hover:underline"
            >
              <Paperclip aria-hidden size={14} className="shrink-0" />
              <span className="truncate">{assignment.fileName ?? 'Material de referencia'}</span>
            </a>
          )}

          {submission ? (
            <div className="rounded-2xl border border-line bg-surface-muted p-3.5">
              <p className="text-body-sm font-bold text-fg">Tu entrega</p>
              {submission.kind === 'audio' && submissionUrl ? (
                <audio src={submissionUrl} controls className="mt-2 w-full" />
              ) : (
                <a
                  href={submissionUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block truncate text-body-sm font-semibold text-brand hover:underline"
                >
                  {submission.fileName}
                </a>
              )}
              {submission.gradedAt ? (
                <div className="mt-2.5 border-t border-line pt-2.5">
                  <p className="text-body-sm font-bold text-fg">Nota: {submission.grade ?? '—'}</p>
                  {submission.feedback && (
                    <p className="mt-1 text-body-sm text-fg-soft">{submission.feedback}</p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-tiny font-semibold text-fg-ghost">Esperando calificación del docente</p>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3"
                  disabled={deletePending}
                  onClick={() => onDelete(submission.id)}
                >
                  {deletePending ? 'Borrando…' : 'Borrar para resubir'}
                </Button>
              )}
              {!canDelete && !submission.gradedAt && (
                <p className="mt-2 text-tiny font-semibold text-danger-strong">
                  La fecha límite ya venció — la entrega quedó bloqueada.
                </p>
              )}
            </div>
          ) : canSubmit ? (
            <div>
              {mode === 'choose' && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={submitPending} onClick={() => setMode('file')}>
                    Subir archivo
                  </Button>
                  <Button variant="outline" size="sm" disabled={submitPending} onClick={() => setMode('audio')}>
                    Grabar audio
                  </Button>
                </div>
              )}
              {mode === 'file' && (
                <UploadDropzone
                  courseId={courseId}
                  moduleId={assignment.moduleId}
                  onUploaded={(result) =>
                    onSubmit({ kind: 'file', mediaKey: result.mediaKey, fileName: result.fileName })
                  }
                />
              )}
              {mode === 'audio' && (
                <AudioRecorder
                  onRecorded={async (file) => {
                    try {
                      const result = await uploadFile({
                        file,
                        courseId,
                        moduleId: assignment.moduleId,
                        onProgress: () => undefined,
                      });
                      onSubmit({ kind: 'audio', mediaKey: result.mediaKey, fileName: file.name });
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'No se pudo subir el audio');
                    }
                  }}
                />
              )}
            </div>
          ) : (
            <p className="text-body-sm font-semibold text-danger-strong">
              La fecha límite de esta tarea ya venció — no se puede entregar.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
