'use client';

import { useState } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAddComment, useComments, useDeleteComment } from '@/features/learning/hooks/use-learning';
import type { LessonComment } from '@/types';

export interface LessonCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string | null;
  lessonTitle: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Moderación de comentarios: no existía ninguna pantalla desde la que el
 * docente pudiera ver, responder ni borrar los comentarios que los
 * alumnos dejan en un video. La vista del alumno (`/curso`) no sirve para
 * esto — resuelve "mis cursos" por matrícula, y el staff nunca está
 * matriculado. Aquí sólo se lista, se responde y se borra: sin
 * reproductor de video.
 */
export function LessonCommentsDialog({
  open,
  onOpenChange,
  lessonId,
  lessonTitle,
}: LessonCommentsDialogProps) {
  const { data: comments, isPending } = useComments(lessonId ?? '');
  const addComment = useAddComment(lessonId ?? '');
  const deleteComment = useDeleteComment(lessonId ?? '');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');

  const topLevelComments = (comments ?? []).filter((comment) => !comment.parentId);
  const repliesByParent = new Map<string, LessonComment[]>();
  for (const comment of comments ?? []) {
    if (!comment.parentId) continue;
    const list = repliesByParent.get(comment.parentId) ?? [];
    list.push(comment);
    repliesByParent.set(comment.parentId, list);
  }

  const submitReply = (parentId: string) => {
    if (!replyDraft.trim()) return;
    addComment.mutate(
      { body: replyDraft.trim(), parentId },
      { onSuccess: () => setReplyingToId(null) },
    );
    setReplyDraft('');
  };

  const renderComment = (comment: LessonComment, options: { indented?: boolean } = {}) => (
    <div key={comment.id} className={options.indented ? 'flex gap-2.5' : 'flex gap-3'}>
      <Avatar
        name={comment.authorName}
        color={comment.fromStaff ? '#2F6BFF' : '#0F5257'}
        size={options.indented ? 30 : 34}
      />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="text-body-sm font-bold text-fg">{comment.authorName}</span>
          <Badge tone={comment.fromStaff ? 'accent' : 'neutral'}>
            {comment.fromStaff ? 'Docente' : 'Alumno'}
          </Badge>
          <span className="text-caption font-semibold text-fg-ghost">
            {formatDate(comment.createdAt)}
          </span>
        </p>
        <p className="mt-[3px] text-body font-medium leading-[1.55] text-fg-body">{comment.body}</p>
        <div className="mt-1.5 flex gap-1.5">
          {!options.indented && (
            <Button
              variant="quiet"
              size="xs"
              onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
            >
              Responder
            </Button>
          )}
          <Button
            variant="quiet"
            size="xs"
            onClick={() => deleteComment.mutate(comment.id)}
            disabled={deleteComment.isPending}
            className="text-danger hover:bg-danger-soft"
          >
            Borrar
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={560}>
        <DialogTitle>Comentarios de &ldquo;{lessonTitle}&rdquo;</DialogTitle>
        <DialogDescription>
          Como docente puedes responder y borrar cualquier comentario de este video.
        </DialogDescription>

        <div className="mt-4 max-h-[420px] overflow-y-auto">
          {isPending && (
            <p className="text-body-sm font-semibold text-fg-faint">Cargando comentarios…</p>
          )}

          {!isPending && topLevelComments.length === 0 && (
            <p className="text-body-sm font-semibold text-fg-faint">
              Todavía no hay comentarios en este video.
            </p>
          )}

          {topLevelComments.length > 0 && (
            <ul className="flex flex-col gap-4">
              {topLevelComments.map((comment) => (
                <li
                  key={comment.id}
                  className="flex flex-col gap-3 border-b border-line pb-4 last:border-0 last:pb-0"
                >
                  {renderComment(comment)}

                  {repliesByParent.get(comment.id)?.map((reply) => (
                    <div key={reply.id} className="ml-[46px]">
                      {renderComment(reply, { indented: true })}
                    </div>
                  ))}

                  {replyingToId === comment.id && (
                    <div className="ml-[46px]">
                      <Textarea
                        value={replyDraft}
                        onChange={(event) => setReplyDraft(event.target.value)}
                        placeholder={`Responder a ${comment.authorName}…`}
                        autoFocus
                      />
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => submitReply(comment.id)}
                          disabled={!replyDraft.trim() || addComment.isPending}
                          className="rounded-lg px-[15px] py-[9px] text-label"
                        >
                          {addComment.isPending ? 'Publicando…' : 'Responder'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReplyingToId(null);
                            setReplyDraft('');
                          }}
                          className="rounded-lg px-[15px] py-[9px] text-label"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
