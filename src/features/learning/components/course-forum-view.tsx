'use client';

import { ArrowLeft, MessageCircle, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import { useCourseThreads, useCreateCourseThread, useMyCourses } from '../hooks/use-learning';
import { NewThreadDialog } from './new-thread-dialog';

export interface CourseForumViewProps {
  courseId: string;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Espacio de discusión A NIVEL DE CURSO — distinto de los comentarios por
 * lección (`lesson_comments`), que ya eran visibles entre alumnos pero
 * están atados a un video concreto. Este es para preguntas generales que no
 * tienen sentido colgadas de una lección específica.
 */
export function CourseForumView({ courseId }: CourseForumViewProps) {
  const router = useRouter();
  const { data: courses } = useMyCourses();
  const course = courses?.find((c) => c.id === courseId);
  const { data: threads, isPending } = useCourseThreads(courseId);
  const createThread = useCreateCourseThread(courseId);
  const [newThreadOpen, setNewThreadOpen] = useState(false);

  return (
    <div className="mx-auto max-w-[720px] px-5 py-4 lg:px-[30px] lg:py-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <Link
            href={ROUTES.student.curso}
            className="flex w-fit items-center gap-1.5 text-tiny font-bold text-fg-dim hover:text-fg"
          >
            <ArrowLeft aria-hidden size={14} strokeWidth={2.4} />
            Mis cursos
          </Link>
          <h1 className="mt-2 text-heading-sm font-extrabold tracking-heading text-fg">
            Foro {course ? `de ${course.name}` : 'del curso'}
          </h1>
        </div>
        <Button size="md" onClick={() => setNewThreadOpen(true)}>
          <Plus aria-hidden size={15} strokeWidth={2.4} />
          Nuevo tema
        </Button>
      </div>

      {isPending && (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[70px] rounded-2xl" />
          ))}
        </div>
      )}

      {threads && threads.length === 0 && (
        <EmptyState
          title="Todavía no hay temas"
          description="Sé el primero en preguntar algo sobre el curso — tus compañeros y el docente pueden responder."
          action={
            <Button size="md" className="font-extrabold" onClick={() => setNewThreadOpen(true)}>
              Abrir el primer tema
            </Button>
          }
        />
      )}

      {threads && threads.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {threads.map((thread) => (
            <li key={thread.id}>
              <Link href={ROUTES.student.foroTema(courseId, thread.id)}>
                <Card
                  padding="md"
                  radius="xl"
                  className="transition-[border-color,transform] duration-[160ms] hover:-translate-y-0.5 hover:border-fg-placeholder"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-body-lg font-bold text-fg">{thread.title}</h2>
                      <p className="mt-1 line-clamp-2 text-body-sm font-medium text-fg-soft">{thread.body}</p>
                      <p className="mt-2 flex items-center gap-1.5 text-tiny font-bold text-fg-ghost">
                        {thread.authorName}
                        {thread.fromStaff && <Badge tone="accent">Docente</Badge>}
                        <span aria-hidden>·</span>
                        {formatWhen(thread.createdAt)}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-tiny font-bold text-fg-ghost">
                      <MessageCircle aria-hidden size={13} strokeWidth={2.2} />
                      {thread.replyCount}
                    </span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <NewThreadDialog
        open={newThreadOpen}
        onOpenChange={setNewThreadOpen}
        pending={createThread.isPending}
        onSubmit={(values) =>
          createThread.mutateAsync(values).then((thread) => {
            setNewThreadOpen(false);
            router.push(ROUTES.student.foroTema(courseId, thread.id));
          })
        }
      />
    </div>
  );
}
