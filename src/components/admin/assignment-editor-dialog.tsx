'use client';

import { Paperclip } from 'lucide-react';
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
import { UploadDropzone } from '@/features/content/components/upload-dropzone';
import type { CreateAssignmentInput } from '@/services';
import type { Assignment } from '@/types';

export interface AssignmentEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  courseId: string;
  moduleTitle: string;
  /** `null` = crear una tarea nueva; con valor = editarla. */
  assignment: Assignment | null;
  pending?: boolean;
  onSave: (input: Omit<CreateAssignmentInput, 'moduleId'>) => void;
}

/** `datetime-local` no acepta segundos/zona — se recorta a minutos, hora local. */
function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultDueAt(): string {
  const inAWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return toDatetimeLocal(inAWeek.toISOString());
}

export function AssignmentEditorDialog({
  open,
  onOpenChange,
  moduleId,
  courseId,
  moduleTitle,
  assignment,
  pending,
  onSave,
}: AssignmentEditorDialogProps) {
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueAt, setDueAt] = useState(defaultDueAt());
  const [attachment, setAttachment] = useState<{ mediaKey: string; fileName: string; contentType: string } | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    setTitle(assignment?.title ?? '');
    setInstructions(assignment?.instructions ?? '');
    setDueAt(assignment ? toDatetimeLocal(assignment.dueAt) : defaultDueAt());
    setAttachment(
      assignment?.mediaKey && assignment.fileName
        ? { mediaKey: assignment.mediaKey, fileName: assignment.fileName, contentType: '' }
        : null,
    );
  }, [open, assignment]);

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('La tarea necesita un título');
      return;
    }
    if (!instructions.trim()) {
      toast.error('Escribí la consigna para el alumno');
      return;
    }
    const dueAtIso = new Date(dueAt).toISOString();
    onSave({
      title,
      instructions,
      dueAt: dueAtIso,
      attachment: attachment ?? undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={560}>
        <DialogTitle>{assignment ? 'Editar tarea' : 'Nueva tarea'}</DialogTitle>
        <DialogDescription>{moduleTitle}</DialogDescription>

        <div className="mt-4 flex flex-col gap-4">
          <Field label="Título">
            {(fieldProps) => (
              <Input {...fieldProps} value={title} onChange={(e) => setTitle(e.target.value)} />
            )}
          </Field>

          <Field label="Consigna para el alumno">
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                rows={5}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            )}
          </Field>

          <Field label="Fecha límite" className="max-w-[240px]">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            )}
          </Field>

          <div>
            <p className="mb-1.5 text-meta font-bold text-fg-subtle">Adjunto (opcional)</p>
            {attachment ? (
              <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-muted px-3.5 py-2.5">
                <Paperclip aria-hidden size={14} className="shrink-0 text-fg-faint" />
                <span className="min-w-0 flex-1 truncate text-body-sm font-semibold text-fg">
                  {attachment.fileName}
                </span>
                <Button variant="quiet" size="xs" onClick={() => setAttachment(null)}>
                  Quitar
                </Button>
              </div>
            ) : (
              <UploadDropzone
                courseId={courseId}
                moduleId={moduleId}
                onUploaded={(result) =>
                  setAttachment({
                    mediaKey: result.mediaKey,
                    fileName: result.fileName,
                    contentType: result.contentType,
                  })
                }
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="md" className="font-extrabold" disabled={pending} onClick={handleSave}>
            {pending ? 'Guardando…' : 'Guardar tarea'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
