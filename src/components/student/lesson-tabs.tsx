'use client';

import { MessageCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { LessonComment, LessonNote } from '@/types';

/** Pestañas tipo cápsula, sólo para este panel — el `Tabs` compartido
 * sigue siendo subrayado por defecto para cualquier otro consumidor. */
const PILL_LIST = 'flex w-fit gap-1 rounded-pill border-0 bg-surface-muted p-1';
const PILL_TRIGGER =
  'rounded-pill border-0 px-3.5 py-[7px] text-body-sm font-bold text-fg-faint ' +
  'data-[state=active]:border-0 data-[state=active]:bg-fg data-[state=active]:text-white ' +
  'hover:text-fg-subtle data-[state=active]:hover:text-white';

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

function formatTimestamp(seconds: number): string {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

export interface LessonTabsProps {
  description: string | null;
  notes: LessonNote[];
  notesPending?: boolean;
  /** Segundo actual del video — la nota se guarda ahí, no en un valor inventado. */
  currentTimeSeconds: number;
  onAddNote: (body: string) => void;
  addNotePending?: boolean;
  onSeekToNote?: (seconds: number) => void;
  comments: LessonComment[];
  commentsPending?: boolean;
  /** `parentId` presente = respuesta a ese comentario, no uno nuevo suelto. */
  onAddComment: (body: string, parentId?: string) => void;
  addCommentPending?: boolean;
  onDeleteComment: (commentId: string) => void;
  /** Sólo el autor del comentario (o de la respuesta) puede borrarlo desde aquí. */
  currentUserId: string | null;
  /** Hay comentarios de otra persona más nuevos que la última vez que se abrió esta pestaña. */
  hasUnseenComments?: boolean;
  /** Se llama al entrar a la pestaña "Comentarios" — apaga el aviso de "nuevo". */
  onCommentsTabOpen?: () => void;
}

/** Paneles de la lección: descripción, archivos, notas y comentarios. */
export function LessonTabs({
  description,
  notes,
  notesPending,
  currentTimeSeconds,
  onAddNote,
  addNotePending,
  onSeekToNote,
  comments,
  commentsPending,
  onAddComment,
  addCommentPending,
  onDeleteComment,
  currentUserId,
  hasUnseenComments,
  onCommentsTabOpen,
}: LessonTabsProps) {
  const [draft, setDraft] = useState('');
  const [composing, setComposing] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [descExpanded, setDescExpanded] = useState(false);

  const submitNote = () => {
    if (!draft.trim()) return;
    onAddNote(draft.trim());
    setDraft('');
    setComposing(false);
  };

  const submitComment = () => {
    if (!commentDraft.trim()) return;
    onAddComment(commentDraft.trim());
    setCommentDraft('');
  };

  const submitReply = (parentId: string) => {
    if (!replyDraft.trim()) return;
    onAddComment(replyDraft.trim(), parentId);
    setReplyDraft('');
    setReplyingToId(null);
  };

  const topLevelComments = comments.filter((comment) => !comment.parentId);
  const repliesByParent = new Map<string, LessonComment[]>();
  for (const comment of comments) {
    if (!comment.parentId) continue;
    const list = repliesByParent.get(comment.parentId) ?? [];
    list.push(comment);
    repliesByParent.set(comment.parentId, list);
  }

  // Autores únicos, más recientes primero — sólo para la pila de avatares
  // de la cabecera de "Comentarios", no cambia el orden del hilo en sí.
  const recentAuthors: LessonComment[] = [];
  const seenAuthorIds = new Set<string>();
  for (const comment of [...comments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )) {
    if (seenAuthorIds.has(comment.authorId)) continue;
    seenAuthorIds.add(comment.authorId);
    recentAuthors.push(comment);
    if (recentAuthors.length === 4) break;
  }

  return (
    <Tabs
      defaultValue="desc"
      onValueChange={(value) => {
        if (value === 'comments') onCommentsTabOpen?.();
      }}
    >
      <TabsList className={PILL_LIST}>
        <TabsTrigger value="desc" className={PILL_TRIGGER}>
          Descripción
        </TabsTrigger>
        <TabsTrigger value="notes" className={PILL_TRIGGER}>
          <span className="md:hidden">Notas</span>
          <span className="hidden md:inline">Mis notas</span>
        </TabsTrigger>
        <TabsTrigger value="comments" className={cn(PILL_TRIGGER, 'relative')}>
          Comentarios
          {hasUnseenComments && (
            <span
              aria-label="Comentarios nuevos"
              className="absolute -right-1 -top-0.5 size-[7px] rounded-full bg-danger"
            />
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="desc">
        <div className="flex gap-3 rounded-4xl bg-accent-tint p-4">
          <Sparkles aria-hidden size={18} strokeWidth={2.2} className="mt-0.5 shrink-0 text-accent" />
          <div className="min-w-0">
            <p
              className={cn(
                'text-body-lg font-medium leading-[1.65] text-fg-body',
                !descExpanded && 'line-clamp-3',
              )}
            >
              {description || 'Tu docente todavía no escribió una descripción para este video.'}
            </p>
            {description && description.length > 160 && (
              <button
                type="button"
                onClick={() => setDescExpanded((v) => !v)}
                className="mt-1.5 text-tiny font-extrabold text-accent hover:underline"
              >
                {descExpanded ? 'Leer menos' : 'Leer más'}
              </button>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="notes">
        {!notesPending && notes.length === 0 && !composing && (
          <div className="rounded-4xl border-[1.5px] border-dashed border-line-dashed bg-surface-subtle px-[18px] py-4">
            <p className="text-body font-bold text-fg">Aún no tienes notas en esta lección</p>
            <p className="mt-1 text-body-sm font-medium text-fg-faint">
              Escribe una nota y se guarda en el minuto exacto del video en el que vas.
            </p>
          </div>
        )}

        {notes.length > 0 && (
          <ul className="flex flex-col gap-2.5">
            {notes.map((note) => (
              <li key={note.id} className="rounded-3xl border border-line px-3.5 py-[13px]">
                <button
                  type="button"
                  onClick={() => onSeekToNote?.(note.timestampSeconds)}
                  className="text-tiny font-extrabold text-brand hover:underline"
                >
                  {formatTimestamp(note.timestampSeconds)}
                </button>
                <p className="mt-1 text-body-sm font-medium text-fg-body">{note.body}</p>
              </li>
            ))}
          </ul>
        )}

        {composing ? (
          <div className="mt-3">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Nota en el minuto ${formatTimestamp(currentTimeSeconds)}…`}
              autoFocus
            />
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                onClick={submitNote}
                disabled={!draft.trim() || addNotePending}
                className="rounded-lg px-[15px] py-[9px] text-label"
              >
                {addNotePending ? 'Guardando…' : `Guardar en ${formatTimestamp(currentTimeSeconds)}`}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setComposing(false);
                  setDraft('');
                }}
                className="rounded-lg px-[15px] py-[9px] text-label"
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={() => setComposing(true)}
            className="mt-3 rounded-lg px-[15px] py-[9px] text-label"
          >
            Añadir nota
          </Button>
        )}
      </TabsContent>

      <TabsContent value="comments">
        <div className="mb-3.5 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-body-sm font-bold text-fg">
            <MessageCircle aria-hidden size={15} strokeWidth={2.2} className="text-fg-ghost" />
            {comments.length} {comments.length === 1 ? 'comentario' : 'comentarios'}
          </p>
          {recentAuthors.length > 0 && (
            <div className="flex -space-x-2">
              {recentAuthors.map((comment) => (
                <Avatar
                  key={comment.authorId}
                  name={comment.authorName}
                  color={comment.fromStaff ? '#2F6BFF' : '#0F5257'}
                  size={26}
                  className="ring-2 ring-surface"
                />
              ))}
            </div>
          )}
        </div>

        {!commentsPending && comments.length === 0 && (
          <p className="text-body-sm font-medium text-fg-faint">
            Todavía no hay comentarios en este video. Sé el primero en preguntar algo.
          </p>
        )}

        {topLevelComments.length > 0 && (
          <ul className="flex flex-col gap-3.5">
            {topLevelComments.map((comment) => (
              <li key={comment.id} className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <Avatar
                    name={comment.authorName}
                    color={comment.fromStaff ? '#2F6BFF' : '#0F5257'}
                    size={34}
                  />
                  <div className="min-w-0 flex-1 rounded-3xl bg-surface-muted px-3.5 py-[13px]">
                    <p className="flex flex-wrap items-baseline gap-2">
                      <span className="text-body-sm font-bold text-fg">
                        {comment.authorName}
                        {comment.fromStaff && ' (docente)'}
                      </span>
                      <span className="text-caption font-semibold text-fg-ghost">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </p>
                    <p className="mt-[3px] text-body font-medium leading-[1.55] text-fg-body">
                      {comment.body}
                    </p>
                    <div className="mt-1.5 flex gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setReplyingToId(replyingToId === comment.id ? null : comment.id)
                        }
                        className="text-tiny font-bold text-fg-ghost hover:text-fg hover:underline"
                      >
                        Responder
                      </button>
                      {comment.authorId === currentUserId && (
                        <button
                          type="button"
                          onClick={() => onDeleteComment(comment.id)}
                          className="text-tiny font-bold text-danger hover:underline"
                        >
                          Borrar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {(repliesByParent.get(comment.id)?.length ?? 0) > 0 && (
                  <ul className="ml-[46px] flex flex-col gap-3">
                    {repliesByParent.get(comment.id)!.map((reply) => (
                      <li key={reply.id} className="flex gap-2.5">
                        <Avatar
                          name={reply.authorName}
                          color={reply.fromStaff ? '#2F6BFF' : '#0F5257'}
                          size={30}
                        />
                        <div className="min-w-0 flex-1 rounded-3xl bg-surface-muted px-3 py-2.5">
                          <p className="flex flex-wrap items-baseline gap-2">
                            <span className="text-body-sm font-bold text-fg">
                              {reply.authorName}
                              {reply.fromStaff && ' (docente)'}
                            </span>
                            <span className="text-caption font-semibold text-fg-ghost">
                              {formatRelativeTime(reply.createdAt)}
                            </span>
                          </p>
                          <p className="mt-[3px] text-body font-medium leading-[1.55] text-fg-body">
                            {reply.body}
                          </p>
                          {reply.authorId === currentUserId && (
                            <button
                              type="button"
                              onClick={() => onDeleteComment(reply.id)}
                              className="mt-1 text-tiny font-bold text-danger hover:underline"
                            >
                              Borrar
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

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
                        disabled={!replyDraft.trim() || addCommentPending}
                        className="rounded-lg px-[15px] py-[9px] text-label"
                      >
                        {addCommentPending ? 'Publicando…' : 'Responder'}
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

        <div className="mt-3.5">
          <Textarea
            value={commentDraft}
            onChange={(event) => setCommentDraft(event.target.value)}
            placeholder="Escribe una pregunta o un comentario sobre este video…"
          />
          <Button
            size="sm"
            onClick={submitComment}
            disabled={!commentDraft.trim() || addCommentPending}
            className="mt-2 rounded-lg px-[15px] py-[9px] text-label"
          >
            {addCommentPending ? 'Publicando…' : 'Comentar'}
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}
