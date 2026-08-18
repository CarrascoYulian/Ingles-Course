'use client';

import { ArrowLeft, Lock, MessagesSquare } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Eyebrow } from '@/components/shared/section-title';
import { CoursePickerCard } from '@/components/student/course-picker-card';
import { LessonList } from '@/components/student/lesson-list';
import { LessonTabs } from '@/components/student/lesson-tabs';
import { ModuleCompleteModal } from '@/components/student/module-complete-modal';
import { ProgressCard } from '@/components/student/progress-card';
import { QuizTakeDialog } from '@/components/student/quiz-take-dialog';
import { VideoPlayer } from '@/components/student/video-player';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import { avatarColorFor } from '@/constants/palettes';
import { useModules } from '@/features/content/hooks/use-content-blocks';
import {
  useAddComment,
  useAddNote,
  useComments,
  useCommentsLastSeen,
  useCurrentModule,
  useDeleteComment,
  useLessonVideoUrl,
  useMarkCommentsSeen,
  useModuleQuiz,
  useMyCourses,
  useModuleLessons,
  useMyProgress,
  useMyQuizAttempts,
  useNotes,
  useOpenResource,
  useResources,
} from '../hooks/use-learning';
import { useVideoProgress } from '../hooks/use-video-progress';

export interface CourseViewProps {
  /** `order` de la lección pedida por la URL — si no llega, se usa la "actual". */
  lessonOrder?: number;
  /** Autor autenticado — decide qué comentarios trae el botón "Borrar". */
  currentUserId?: string | null;
}

export function CourseView({ lessonOrder, currentUserId = null }: CourseViewProps = {}) {
  const router = useRouter();

  // Antes esta pantalla resolvía "el" módulo global sin importar en qué
  // curso(s) estuviera matriculado el alumno — con más de un curso en la
  // base, cualquier estudiante podía terminar viendo contenido de un curso
  // ajeno. Ahora se resuelve primero a qué curso(s) pertenece de verdad.
  const { data: courses, isPending: isCoursesPending } = useMyCourses();
  const [selectedCourseId, setSelectedCourseId] = useState('');
  // Un enlace compartido a una lección concreta (`/curso/b1/mod/leccion-5`)
  // debe entrar directo al contenido — el selector de curso sólo aparece
  // cuando el alumno llega por la navegación normal ("Mi curso").
  const syncedCourses = useRef(false);
  useEffect(() => {
    if (!courses || syncedCourses.current || lessonOrder === undefined) return;
    syncedCourses.current = true;
    setSelectedCourseId(courses[0]?.id ?? '');
  }, [courses, lessonOrder]);

  const course = courses?.find((c) => c.id === selectedCourseId);
  const { data: module, isPending: isModulePending } = useCurrentModule(selectedCourseId);
  const { data: lessons, isPending } = useModuleLessons(module?.id ?? '');
  const { data: progress, isPending: isProgressPending } = useMyProgress(selectedCourseId);
  const { data: resources } = useResources({ courseId: course?.id, moduleId: module?.id });
  const openResource = useOpenResource();
  const [seekRequest, setSeekRequest] = useState<{ seconds: number; nonce: number } | null>(null);
  const { data: allModules } = useModules(selectedCourseId);
  const [moduleCompleteOpen, setModuleCompleteOpen] = useState(false);
  const [quizTakeOpen, setQuizTakeOpen] = useState(false);
  // Regla confirmada por el cliente: reprobar (o no haber rendido todavía)
  // el quiz de un módulo bloquea avanzar al siguiente — `hasPassedModuleQuiz`
  // decide si "Continuar" navega directo o abre el quiz primero.
  const { data: moduleQuiz } = useModuleQuiz(module?.id ?? '');
  const { data: moduleQuizAttempts } = useMyQuizAttempts(moduleQuiz?.id ?? '');
  const hasPassedModuleQuiz = moduleQuizAttempts?.some((attempt) => attempt.passed) ?? false;

  // Antes esta pantalla ignoraba por completo el parámetro `leccion-N` de su
  // propia URL y siempre mostraba "la lección actual" calculada por dentro
  // — un enlace compartido a la lección 2 abría la lección 5 igual. Si la
  // URL trae un `order` válido se respeta; si no, se cae a la actual.
  // Con TODAS las lecciones ya vistas, ninguna queda marcada "current" —
  // antes eso dejaba `currentLesson` en `undefined` y el reproductor
  // mostraba "Video no disponible" aunque el módulo estuviera completo.
  // Cae a la última lección real en vez de a nada.
  const requestedLesson = lessons?.find((lesson) => lesson.order === lessonOrder);
  const currentLesson =
    requestedLesson ?? lessons?.find((lesson) => lesson.state === 'current') ?? lessons?.at(-1);
  const { data: videoUrl } = useLessonVideoUrl(currentLesson?.mediaKey ?? null);
  const video = useVideoProgress(
    currentLesson?.id ?? '',
    currentLesson?.watchedPercent ?? 0,
    currentLesson?.durationSeconds || undefined,
    currentLesson?.mediaKey != null,
  );
  const { data: notes = [], isPending: notesPending } = useNotes(currentLesson?.id ?? '');
  const addNote = useAddNote(currentLesson?.id ?? '');
  const noteMarkers = notes.map((note) => (note.timestampSeconds / video.durationSeconds) * 100);
  const { data: comments = [], isPending: commentsPending } = useComments(currentLesson?.id ?? '');
  const addComment = useAddComment(currentLesson?.id ?? '');
  const deleteComment = useDeleteComment(currentLesson?.id ?? '');
  const { data: commentsLastSeen } = useCommentsLastSeen(currentLesson?.id ?? '');
  const markCommentsSeen = useMarkCommentsSeen(currentLesson?.id ?? '');
  // "Nuevo" = alguien más comentó después de la última vez que este usuario
  // abrió la pestaña — antes no había ninguna señal de esto, ni en el
  // video ni en la pestaña, igual que ya existe para los mensajes del
  // docente (bolita en "Mensajes" del nav).
  const hasUnseenComments = comments.some(
    (comment) =>
      comment.authorId !== currentUserId &&
      (!commentsLastSeen || new Date(comment.createdAt) > new Date(commentsLastSeen)),
  );

  const completed = lessons?.filter((lesson) => lesson.state === 'done').length ?? 0;
  const total = lessons?.length ?? 0;

  if (isCoursesPending) {
    return (
      <div className="flex flex-col gap-4 px-5 py-4 lg:px-[30px] lg:py-6">
        <Skeleton className="aspect-video rounded-9xl" />
        <Skeleton className="h-40 rounded-8xl" />
      </div>
    );
  }

  // Sin matrícula no hay ningún curso que mostrar. Antes esto sólo decía
  // "escríbele a tu docente" en texto plano, sin ningún botón que de verdad
  // llevara a hacerlo — el alumno tenía que encontrar "Mensajes" solo en el
  // nav.
  if (!courses || courses.length === 0) {
    return (
      <div className="px-5 py-8 lg:px-[30px] lg:py-12">
        <EmptyState
          title="Todavía no estás matriculado en ningún curso"
          description="Escríbele a tu docente para que te matricule y puedas empezar."
          action={
            <Button asChild size="md" className="font-extrabold">
              <Link href={ROUTES.student.mensajes}>Escribirle a mi docente</Link>
            </Button>
          }
        />
      </div>
    );
  }

  // Antes se entraba directo al primer curso matriculado sin que el alumno
  // eligiera — con "Mis cursos" mostrando siempre uno solo, no había forma
  // de saber en qué curso estabas ni de volver a la lista. Ahora el punto de
  // entrada es explícito: se elige el curso, luego se entra a su contenido.
  if (!course) {
    return (
      <div className="px-5 py-8 lg:px-[30px] lg:py-12">
        <h1 className="text-heading-sm font-extrabold tracking-heading text-fg lg:text-heading-lg">
          Mis cursos
        </h1>
        <p className="mt-1 text-body-sm font-semibold text-fg-dim">
          Elige un curso para continuar donde lo dejaste.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CoursePickerCard key={c.id} course={c} onSelect={(selected) => setSelectedCourseId(selected.id)} />
          ))}
        </div>
      </div>
    );
  }

  if (isModulePending) {
    return (
      <div className="flex flex-col gap-4 px-5 py-4 lg:px-[30px] lg:py-6">
        <Skeleton className="aspect-video rounded-9xl" />
        <Skeleton className="h-40 rounded-8xl" />
      </div>
    );
  }

  const courseSwitcher = (
    <button
      type="button"
      onClick={() => setSelectedCourseId('')}
      className="mx-5 flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-tiny font-bold text-fg-dim transition-colors hover:bg-surface-sunken hover:text-fg lg:mx-0"
    >
      <ArrowLeft aria-hidden size={14} strokeWidth={2.4} />
      Mis cursos
    </button>
  );

  // Antes, sin módulos reales en la base de datos, esto caía a un módulo de
  // ejemplo fijo — el alumno veía "Present Perfect vs. Past Simple" como si
  // fuera contenido real de su curso. Ahora se muestra un vacío honesto.
  if (!module) {
    return (
      <div className="flex flex-col gap-4">
        {courseSwitcher}
        <div className="px-5 py-8 lg:px-[30px] lg:py-12">
          <EmptyState
            title="Todavía no hay ningún módulo publicado"
            description="Tu docente aún no ha creado contenido para este curso. Vuelve pronto."
          />
        </div>
      </div>
    );
  }

  const moduleLabel = module.title;
  const lessonTitle = currentLesson?.title ?? moduleLabel;
  const lessonPosition = currentLesson ? lessons!.indexOf(currentLesson) + 1 : 0;
  const isLastModule = allModules ? allModules.at(-1)?.id === module.id : false;

  // Se engancha al evento nativo `ended` del `<video>` (no a un efecto
  // reactivo sobre `watched`) a propósito: sólo debe abrirse en el
  // instante real en que el alumno termina de ver un video, nunca al
  // volver a entrar a un módulo que ya estaba completo de antes. Revisar
  // las OTRAS lecciones (no la actual) cubre cualquier orden en que las
  // haya visto, no sólo "la última del listado".
  const handleVideoEnded = () => {
    video.onEnded();
    if (!currentLesson || !lessons) return;
    const others = lessons.filter((lesson) => lesson.id !== currentLesson.id);
    const wasLastPending = others.every((lesson) => lesson.state === 'done');
    if (wasLastPending) setModuleCompleteOpen(true);
  };

  const continueAfterModule = () => {
    // Al terminar el curso entero no alcanza con navegar a `/curso`: como
    // el módulo "actual" de un curso 100 % completo cae al último (para
    // poder repasar), sin resetear el curso elegido acá mismo la pantalla
    // se quedaba mostrando ese último video en vez de la lista de "Mis
    // cursos". Si todavía quedan módulos, sólo hace falta la navegación —
    // el próximo módulo ya se resuelve solo.
    if (isLastModule) setSelectedCourseId('');
    router.push(ROUTES.student.curso);
  };

  return (
    <div className="flex flex-col gap-4">
      {courseSwitcher}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-5 lg:px-[30px] lg:py-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <VideoPlayer
            contextLabel={`Lección ${lessonPosition} de ${total} · ${moduleLabel}`}
            contextLabelShort={`Lección ${lessonPosition} · ${moduleLabel}`}
            watched={video.watched}
            maxWatched={video.maxWatched}
            playing={video.playing}
            timeLabel={video.timeLabel}
            canAdvance={video.canAdvance}
            onToggle={video.toggle}
            src={videoUrl}
            onProgress={video.onProgress}
            onEnded={handleVideoEnded}
            markers={noteMarkers}
            seekRequest={seekRequest}
            hasUnseenComments={hasUnseenComments}
            onPrevious={
              currentLesson && lessonPosition > 1
                ? () => {
                    const prevLesson = lessons?.[lessonPosition - 2];
                    if (!prevLesson) return;
                    router.push(
                      ROUTES.student.leccion(course.level.toLowerCase(), module.id, prevLesson.order),
                    );
                  }
                : undefined
            }
            onNext={() => {
              if (!video.canAdvance) {
                toast('Debes terminar el video para continuar');
                return;
              }
              const nextLesson = currentLesson ? lessons?.[lessonPosition] : undefined;
              if (!nextLesson) {
                toast('Ya completaste todas las lecciones de este módulo');
                return;
              }
              router.push(
                ROUTES.student.leccion(course.level.toLowerCase(), module.id, nextLesson.order),
              );
            }}
          />

          <div className="px-5 lg:px-0">
            <Card
              padding="none"
              radius="xl"
              className="max-lg:border-0 max-lg:bg-transparent lg:px-6 lg:py-[22px]"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 hidden size-9 shrink-0 rounded-full sm:block"
                  style={{
                    background: `linear-gradient(135deg, ${avatarColorFor(module.id)}, ${avatarColorFor(module.id)}99)`,
                  }}
                />
                <div className="min-w-0">
                  <Eyebrow>{moduleLabel.toUpperCase()}</Eyebrow>
                  <h1 className="mt-[5px] text-heading-sm font-extrabold tracking-heading text-fg text-pretty lg:mt-1.5 lg:text-heading-lg">
                    {lessonTitle}
                  </h1>
                </div>
              </div>

              <ul className="mt-3 flex flex-wrap gap-2.5">
                <li className="rounded-md bg-surface-sunken px-3 py-[7px] text-meta font-bold text-fg-subtle">
                  Duración {currentLesson?.duration ?? '—'}
                </li>
                <li className="rounded-md bg-surface-sunken px-3 py-[7px] text-meta font-bold text-fg-subtle">
                  Nivel {course.level}
                </li>
              </ul>

              <div className="mt-3.5 lg:mt-[18px]">
                <LessonTabs
                  description={currentLesson?.description ?? null}
                  files={resources ?? []}
                  onOpenFile={(mediaKey) => openResource.mutate(mediaKey)}
                  notes={notes}
                  notesPending={notesPending}
                  currentTimeSeconds={video.elapsedSeconds}
                  onAddNote={(body) => addNote.mutate({ body, timestampSeconds: video.elapsedSeconds })}
                  addNotePending={addNote.isPending}
                  onSeekToNote={(seconds) => setSeekRequest({ seconds, nonce: Date.now() })}
                  comments={comments}
                  commentsPending={commentsPending}
                  onAddComment={(body, parentId) => addComment.mutate({ body, parentId })}
                  addCommentPending={addComment.isPending}
                  onDeleteComment={(commentId) => deleteComment.mutate(commentId)}
                  currentUserId={currentUserId}
                  hasUnseenComments={hasUnseenComments}
                  onCommentsTabOpen={() => markCommentsSeen.mutate()}
                />
              </div>
            </Card>
          </div>
        </div>

        <aside className="flex flex-col gap-3.5 px-5 pb-5 lg:w-aside lg:shrink-0 lg:px-0 lg:pb-0">
          {isProgressPending && <Skeleton className="h-[220px] rounded-8xl" />}
          {progress && (
            <ProgressCard
              percent={progress.percent}
              level={progress.level}
              hours={progress.hoursStudied}
              lessons={progress.lessonsCompleted}
              badges={progress.badgesEarned}
              courseId={course.id}
            />
          )}

          <Link href={ROUTES.student.foro(course.id)}>
            <Card
              padding="md"
              radius="xl"
              className="flex items-center gap-2.5 transition-colors duration-[160ms] hover:border-fg-placeholder"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                <MessagesSquare aria-hidden size={16} strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm font-bold text-fg">Foro del curso</span>
                <span className="block text-tiny font-semibold text-fg-ghost">Preguntas y respuestas con tus compañeros</span>
              </span>
            </Card>
          </Link>

          <Card padding="lg" radius="xl">
            <div className="mb-3 flex items-center justify-between lg:mb-3.5">
              <h2 className="text-body-lg font-bold text-fg">Contenido del módulo</h2>
              <span className="text-tiny font-bold text-fg-ghost">
                {completed} / {total}
              </span>
            </div>

            {isPending && (
              <div className="flex flex-col gap-1">
                <LoadingRegion label="Cargando el contenido del módulo" />
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-12 rounded-2xl" />
                ))}
              </div>
            )}

            {lessons && lessons.length > 0 && (
              <LessonList
                lessons={lessons}
                onSelect={(lesson) => {
                  if (lesson.id === currentLesson?.id) return;
                  router.push(
                    ROUTES.student.leccion(
                      course?.level.toLowerCase() ?? 'b1',
                      module.id,
                      lesson.order,
                    ),
                  );
                }}
              />
            )}

            {lessons && lessons.length === 0 && !isPending && (
              <EmptyState
                compact
                title="Sin lecciones todavía"
                description="Este módulo aún no tiene lecciones publicadas."
              />
            )}

            <p className="mt-3.5 flex items-start gap-[11px] rounded-2xl bg-surface-muted p-[13px]">
              <Lock
                aria-hidden
                size={16}
                strokeWidth={1.9}
                className="mt-px shrink-0 text-fg-faint"
              />
              <span className="text-meta font-semibold leading-normal text-fg-soft">
                El siguiente módulo se abre al terminar el 100 % de este. Tu avance se guarda solo.
              </span>
            </p>
          </Card>
        </aside>
      </div>

      <ModuleCompleteModal
        open={moduleCompleteOpen}
        onOpenChange={setModuleCompleteOpen}
        moduleTitle={moduleLabel}
        isLastModule={isLastModule}
        onViewCertificate={
          isLastModule
            ? () => {
                setModuleCompleteOpen(false);
                router.push(ROUTES.student.certificado(course.id));
              }
            : undefined
        }
        onContinue={() => {
          setModuleCompleteOpen(false);
          // Terminar los videos no alcanza si el módulo tiene evaluación y
          // todavía no se aprobó — el quiz se interpone antes de dejar
          // avanzar, en vez de navegar directo al siguiente módulo.
          if (moduleQuiz && !hasPassedModuleQuiz) {
            setQuizTakeOpen(true);
            return;
          }
          continueAfterModule();
        }}
      />

      {moduleQuiz && (
        <QuizTakeDialog
          open={quizTakeOpen}
          onOpenChange={setQuizTakeOpen}
          moduleId={module.id}
          moduleTitle={moduleLabel}
          onContinue={continueAfterModule}
        />
      )}
    </div>
  );
}
