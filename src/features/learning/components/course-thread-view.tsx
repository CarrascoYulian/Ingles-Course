'use client';

import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ROUTES } from '@/constants/routes';
import {
  useAddThreadReply,
  useCourseThread,
  useDeleteCourseThread,
  useDeleteThreadReply,
  useThreadReplies,
} from '../hooks/use-learning';

export interface CourseThreadViewProps {
  courseId: string;
  threadId: string;
  currentUserId: string | null;
  canModerate: boolean;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('es-DO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function CourseThreadView({ courseId, threadId, currentUserId, canModerate }: CourseThreadViewProps) {
  const router = useRouter();
  const { data: thread, isPending: threadPending } = useCourseThread(threadId);
  const { data: replies, isPending: repliesPending } = useThreadReplies(threadId);
  const addReply = useAddThreadReply(threadId);
  const deleteThread = useDeleteCourseThread(courseId);
  const deleteReply = useDeleteThreadReply(threadId);
  const [replyBody, setReplyBody] = useState('');

  const submitReply = (event: React.FormEvent) => {
    event.preventDefault();
    if (!replyBody.trim()) return;
    addReply.mutate(replyBody, { onSuccess: () => setReplyBody('') });
  };

  return (
    <div className="mx-auto max-w-[720px] px-5 py-4 lg:px-[30px] lg:py-6">
      <Link
        href={ROUTES.student.foro(courseId)}
        className="mb-4 flex w-fit items-center gap-1.5 text-tiny font-bold text-fg-dim hover:text-fg"
      >
        <ArrowLeft aria-hidden size={14} strokeWidth={2.4} />
        Foro del curso
      </Link>

      {threadPending && <Skeleton className="h-[120px] rounded-2xl" />}

      {thread && (
        <Card padding="lg" radius="xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-heading-sm font-extrabold tracking-heading text-fg text-pretty">{thread.title}</h1>
              <p className="mt-1.5 flex items-center gap-1.5 text-tiny font-bold text-fg-ghost">
                {thread.authorName}
                {thread.fromStaff && <Badge tone="accent">Docente</Badge>}
                <span aria-hidden>·</span>
                {formatWhen(thread.createdAt)}
              </p>
            </div>
            {(canModerate || thread.authorId === currentUserId) && (
              <Button
                variant="icon"
                size="square"
                aria-label="Eliminar tema"
                onClick={() =>
                  deleteThread.mutateAsync(thread.id).then(() => router.push(ROUTES.student.foro(courseId)))
                }
                className="shrink-0 hover:border-danger-line hover:text-danger-strong"
              >
                <Trash2 aria-hidden size={13} strokeWidth={2.2} />
              </Button>
            )}
          </div>
          <p className="mt-3.5 whitespace-pre-wrap text-body-sm font-medium leading-normal text-fg-body">
            {thread.body}
          </p>
        </Card>
      )}

      <div className="mt-4 flex flex-col gap-2.5">
        {repliesPending && <Skeleton className="h-16 rounded-2xl" />}
        {replies?.map((reply) => (
          <Card key={reply.id} padding="md" radius="xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-tiny font-bold text-fg-ghost">
                  {reply.authorName}
                  {reply.fromStaff && <Badge tone="accent">Docente</Badge>}
                  <span aria-hidden>·</span>
                  {formatWhen(reply.createdAt)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-body-sm font-medium text-fg-body">{reply.body}</p>
              </div>
              {(canModerate || reply.authorId === currentUserId) && (
                <button
                  type="button"
                  aria-label="Eliminar respuesta"
                  onClick={() => deleteReply.mutate(reply.id)}
                  className="shrink-0 text-fg-faint hover:text-danger-strong"
                >
                  <Trash2 aria-hidden size={13} strokeWidth={2.2} />
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <form onSubmit={submitReply} className="mt-4 flex flex-col gap-2.5">
        <Textarea
          value={replyBody}
          onChange={(event) => setReplyBody(event.target.value)}
          placeholder="Escribe una respuesta…"
        />
        <Button
          type="submit"
          size="md"
          className="w-fit self-end font-extrabold"
          disabled={!replyBody.trim() || addReply.isPending}
        >
          {addReply.isPending ? 'Publicando…' : 'Responder'}
        </Button>
      </form>
    </div>
  );
}
