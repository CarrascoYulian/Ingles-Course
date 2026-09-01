'use client';

import { CheckCircle2, Clock, FileText, MessageSquare, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { LessonComment, LessonNote } from '@/types';

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
  transcript: string | null;
  notes: LessonNote[];
  notesPending?: boolean;
  currentTimeSeconds: number;
  onAddNote: (body: string) => void;
  addNotePending?: boolean;
  onSeekToNote?: (seconds: number) => void;
  comments: LessonComment[];
  commentsPending?: boolean;
  onAddComment: (body: string, parentId?: string) => void;
  addCommentPending?: boolean;
  onDeleteComment: (commentId: string) => void;
  currentUserId: string | null;
  hasUnseenComments?: boolean;
  onCommentsTabOpen?: () => void;
}

/**
 * Pestañas de lección estilo Coursera / LinkedIn Learning.
 */
export function LessonTabs({
  description,
  transcript,
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

  return (
    <Tabs
      defaultValue="desc"
      onValueChange={(value) => {
        if (value === 'comments') onCommentsTabOpen?.();
      }}
      className="w-full"
    >
      <TabsList className="border-b border-slate-200/90 pb-0">
        <TabsTrigger value="desc">Descripción general</TabsTrigger>
        {transcript && <TabsTrigger value="transcript">Transcripción</TabsTrigger>}
        <TabsTrigger value="notes" className="flex items-center gap-1.5">
          <span>Cuaderno de notas</span>
          {notes.length > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.2 text-micro font-extrabold text-brand tabular-nums">
              {notes.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="comments" className="relative flex items-center gap-1.5">
          <span>Preguntas y Foro</span>
          {comments.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.2 text-micro font-extrabold text-slate-600 tabular-nums">
              {comments.length}
            </span>
          )}
          {hasUnseenComments && (
            <span className="size-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
          )}
        </TabsTrigger>
      </TabsList>

      {/* Pestaña: Descripción */}
      <TabsContent value="desc">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/30 p-5 shadow-sm">
          <div className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Sparkles aria-hidden className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="text-body-sm font-extrabold text-slate-900">Objetivos de esta lección</h4>
              <p
                className={cn(
                  'mt-1.5 text-body-sm font-medium leading-relaxed text-slate-600',
                  !descExpanded && 'line-clamp-3',
                )}
              >
                {description || 'El docente no ha especificado notas adicionales para este video.'}
              </p>
              {description && description.length > 160 && (
                <button
                  type="button"
                  onClick={() => setDescExpanded((v) => !v)}
                  className="mt-2 text-caption font-extrabold text-brand hover:underline"
                >
                  {descExpanded ? 'Ver menos' : 'Leer descripción completa →'}
                </button>
              )}
            </div>
          </div>
        </div>
      </TabsContent>

      {/* Pestaña: Transcripción */}
      {transcript && (
        <TabsContent value="transcript">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-center gap-2 text-meta font-extrabold text-slate-700 mb-3">
              <FileText aria-hidden className="size-4 text-brand" />
              <span>Transcripción de audio</span>
            </div>
            <p className="whitespace-pre-line text-body font-normal leading-relaxed text-slate-700 font-sans">
              {transcript}
            </p>
          </div>
        </TabsContent>
      )}

      {/* Pestaña: Notas */}
      <TabsContent value="notes" className="space-y-4">
        {!composing && (
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-blue-50 text-brand">
                <Clock aria-hidden className="size-4" />
              </span>
              <div>
                <p className="text-body-sm font-extrabold text-slate-900">Tomar nota rápida</p>
                <p className="text-caption font-medium text-slate-500">
                  Se sincronizará en el minuto <span className="font-mono font-bold text-brand">{formatTimestamp(currentTimeSeconds)}</span>
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => setComposing(true)} className="gap-1.5 font-extrabold">
              <Plus aria-hidden className="size-4" />
              Nueva nota
            </Button>
          </div>
        )}

        {composing && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/30 p-4 shadow-sm">
            <p className="mb-2 text-caption font-extrabold text-slate-700 flex items-center gap-1.5">
              <Clock aria-hidden className="size-3.5 text-brand" />
              Nota en <span className="font-mono text-brand">{formatTimestamp(currentTimeSeconds)}</span>
            </p>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escribe un concepto clave, traducción o regla gramatical…"
              autoFocus
              className="bg-white"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setComposing(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={submitNote} disabled={!draft.trim() || addNotePending}>
                {addNotePending ? 'Guardando…' : 'Guardar nota'}
              </Button>
            </div>
          </div>
        )}

        {notes.length === 0 && !composing && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
            <p className="text-body-sm font-bold text-slate-800">
              {notesPending ? 'Cargando notas…' : 'No tienes notas en esta lección todavía'}
            </p>
            <p className="mt-1 text-caption text-slate-500">
              Usa las notas para registrar vocabulario nuevo en el segundo exacto del video.
            </p>
          </div>
        )}

        {notes.length > 0 && (
          <ul className="space-y-2.5">
            {notes.map((note) => (
              <li
                key={note.id}
                className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm hover:border-brand/40 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onSeekToNote?.(note.timestampSeconds)}
                    title="Saltar al segundo del video"
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-caption font-extrabold font-mono text-brand hover:bg-brand hover:text-white transition-colors"
                  >
                    <Clock aria-hidden className="size-3" />
                    {formatTimestamp(note.timestampSeconds)}
                  </button>
                  <p className="text-body-sm font-medium text-slate-800 leading-relaxed pt-0.5">{note.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>

      {/* Pestaña: Preguntas / Comentarios */}
      <TabsContent value="comments" className="space-y-4">
        {/* Formulario de nuevo comentario */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <Textarea
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            placeholder="¿Tienes alguna duda sobre la gramática o pronunciación de este video?"
            className="bg-slate-50/70 border-slate-200 focus:bg-white"
          />
          <div className="mt-2.5 flex justify-end">
            <Button
              size="sm"
              onClick={submitComment}
              disabled={!commentDraft.trim() || addCommentPending}
              className="gap-1.5 font-extrabold"
            >
              <MessageSquare aria-hidden className="size-3.5" />
              {addCommentPending ? 'Publicando…' : 'Hacer pregunta'}
            </Button>
          </div>
        </div>

        {comments.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
            <p className="text-body-sm font-bold text-slate-800">
              {commentsPending ? 'Cargando preguntas…' : 'Sin preguntas en esta lección'}
            </p>
            <p className="mt-1 text-caption text-slate-500">
              Pregúntale a tu docente o comparte tus respuestas con la comunidad.
            </p>
          </div>
        )}

        {topLevelComments.length > 0 && (
          <ul className="space-y-3">
            {topLevelComments.map((comment) => (
              <li key={comment.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <Avatar
                    name={comment.authorName}
                    color={comment.fromStaff ? '#2563EB' : '#0F172A'}
                    size={34}
                    className="ring-2 ring-white shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-body-sm font-extrabold text-slate-900">{comment.authorName}</span>
                      {comment.fromStaff && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.2 text-[10px] font-extrabold text-brand">
                          <CheckCircle2 aria-hidden className="size-2.5" />
                          Docente
                        </span>
                      )}
                      <span className="text-caption text-slate-400 font-medium">{formatRelativeTime(comment.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 text-body-sm font-medium text-slate-700 leading-relaxed">{comment.body}</p>

                    <div className="mt-2.5 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
                        className="text-caption font-bold text-brand hover:underline"
                      >
                        Responder
                      </button>
                      {comment.authorId === currentUserId && (
                        <button
                          type="button"
                          onClick={() => onDeleteComment(comment.id)}
                          className="text-caption font-bold text-rose-600 hover:underline flex items-center gap-1"
                        >
                          <Trash2 aria-hidden className="size-3" />
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Respuestas anidadas */}
                {(repliesByParent.get(comment.id)?.length ?? 0) > 0 && (
                  <ul className="mt-3.5 space-y-2.5 pl-9 border-l-2 border-slate-100 ml-4">
                    {repliesByParent.get(comment.id)!.map((reply) => (
                      <li key={reply.id} className="rounded-xl bg-slate-50/80 p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-caption font-extrabold text-slate-900">{reply.authorName}</span>
                          {reply.fromStaff && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.2 text-[9px] font-extrabold text-brand">
                              Docente
                            </span>
                          )}
                          <span className="text-micro text-slate-400">{formatRelativeTime(reply.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-body-sm text-slate-700">{reply.body}</p>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Formulario de respuesta */}
                {replyingToId === comment.id && (
                  <div className="mt-3 pl-9">
                    <Textarea
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      placeholder={`Escribe una respuesta a ${comment.authorName}…`}
                      autoFocus
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <Button variant="ghost" size="xs" onClick={() => setReplyingToId(null)}>
                        Cancelar
                      </Button>
                      <Button size="xs" onClick={() => submitReply(comment.id)} disabled={!replyDraft.trim()}>
                        Enviar respuesta
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}

