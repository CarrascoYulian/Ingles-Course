'use client';

import { ArrowLeft, FolderTree, Layers, Lock, MessagesSquare } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { CourseUnitsModal } from '@/components/student/course-units-modal';
import { CoursePickerCard } from '@/components/student/course-picker-card';
import { LessonFileView } from '@/components/student/lesson-file-view';
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
import { cn } from '@/lib/utils';
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
  useMarkLessonViewed,
  useModuleQuiz,
  useMyCourses,
  useModuleLessons,
  useMyProgress,
  useMyQuizAttempts,
  useNotes,
} from '../hooks/use-learning';
import { useVideoProgress } from '../hooks/use-video-progress';

export interface CourseViewProps {
  /** Nivel del curso pedido por la URL (ej. 'b1', 'a1'). */
  level?: string;
  /** Id o slug del módulo pedido por la URL. */
  moduleSlugOrId?: string;
  /** `order` de la lección pedida por la URL — si no llega, se usa la "actual". */
  lessonOrder?: number;
  /** Autor autenticado — decide qué comentarios trae el botón "Borrar". */
  currentUserId?: string | null;
}

export function CourseView({
  level,
  moduleSlugOrId,
  lessonOrder,
  currentUserId = null,
}: CourseViewProps = {}) {
  const router = useRouter();
  const [isTheater, setIsTheater] = useState(false);

  // Antes esta pantalla resolvía "el" módulo global sin importar en qué
  // curso(s) estuviera matriculado el alumno. Ahora se resuelve primero a qué curso(s) pertenece.
  const { data: courses, isPending: isCoursesPending } = useMyCourses();
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const syncedCourses = useRef(false);

  useEffect(() => {
    if (!courses || courses.length === 0 || syncedCourses.current) return;
    if (level) {
      const match = courses.find((c) => c.level.toLowerCase() === level.toLowerCase());
      if (match) {
        syncedCourses.current = true;
        setSelectedCourseId(match.id);
        return;
      }
    }
    if (lessonOrder !== undefined || courses.length === 1) {
      syncedCourses.current = true;
      setSelectedCourseId(courses[0]?.id ?? '');
    }
  }, [courses, level, lessonOrder]);

  const course = courses?.find((c) => c.id === selectedCourseId);
  const { data: module, isPending: isModulePending } = useCurrentModule(selectedCourseId);
  const { data: allModules } = useModules(selectedCourseId);

  const [manualModuleId, setManualModuleId] = useState<string | null>(null);
  useEffect(() => setManualModuleId(null), [selectedCourseId]);

  useEffect(() => {
    if (moduleSlugOrId && allModules && allModules.length > 0) {
      const match = allModules.find(
        (m) =>
          m.id === moduleSlugOrId ||
          m.title.toLowerCase().replace(/\s+/g, '-') === moduleSlugOrId.toLowerCase(),
      );
      if (match) setManualModuleId(match.id);
    }
  }, [moduleSlugOrId, allModules]);

  const effectiveModule = (manualModuleId && allModules?.find((m) => m.id === manualModuleId)) || module;
  const { data: lessons, isPending } = useModuleLessons(effectiveModule?.id ?? '');
  const { data: progress, isPending: isProgressPending } = useMyProgress(selectedCourseId);
  const [seekRequest, setSeekRequest] = useState<{ seconds: number; nonce: number } | null>(null);
  const [moduleCompleteOpen, setModuleCompleteOpen] = useState(false);
  const [quizTakeOpen, setQuizTakeOpen] = useState(false);
  const [unitsModalOpen, setUnitsModalOpen] = useState(false);

  const { data: moduleQuiz } = useModuleQuiz(effectiveModule?.id ?? '');
  const { data: moduleQuizAttempts } = useMyQuizAttempts(moduleQuiz?.id ?? '');
  const hasPassedModuleQuiz = moduleQuizAttempts?.some((attempt) => attempt.passed) ?? false;

  const [displayLessonId, setDisplayLessonId] = useState<string | null>(null);
  useEffect(() => {
    setDisplayLessonId(null);
  }, [effectiveModule?.id]);

  useEffect(() => {
    if (!lessons || lessons.length === 0) return;
    if (lessonOrder !== undefined) {
      const requested = lessons.find((lesson) => lesson.order === lessonOrder);
      if (requested && requested.id !== displayLessonId) setDisplayLessonId(requested.id);
      return;
    }
    if (displayLessonId && lessons.some((lesson) => lesson.id === displayLessonId)) return;
    const fallback = lessons.find((lesson) => lesson.state === 'current') ?? lessons.at(-1);
    if (fallback) setDisplayLessonId(fallback.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessons, lessonOrder]);

  const currentLesson = lessons?.find((lesson) => lesson.id === displayLessonId);
  const { data: videoUrl, isPending: isVideoUrlPending } = useLessonVideoUrl(currentLesson?.mediaKey ?? null);
  const video = useVideoProgress(
    currentLesson?.id ?? '',
    currentLesson?.watchedPercent ?? 0,
    currentLesson?.durationSeconds || undefined,
    currentLesson?.type === 'Video',
  );
  const markViewed = useMarkLessonViewed();
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

  // La Evaluación de un módulo no es una fila de `lessons` (es un
  // `module_quizzes` aparte, ver `useModuleQuiz`) — sin esto, ni aparecía en
  // "Contenido del módulo" ni contaba como obligatoria para completarlo.
  // Se habilita recién cuando el resto de las lecciones ya están hechas.
  const allOtherLessonsDone = lessons ? lessons.every((lesson) => lesson.state === 'done') : false;
  const quizState: 'done' | 'available' | 'locked' | null = moduleQuiz
    ? hasPassedModuleQuiz
      ? 'done'
      : allOtherLessonsDone
        ? 'available'
        : 'locked'
    : null;
  const completed =
    (lessons?.filter((lesson) => lesson.state === 'done').length ?? 0) + (quizState === 'done' ? 1 : 0);
  const total = (lessons?.length ?? 0) + (moduleQuiz ? 1 : 0);

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
      <div className="px-5 py-8 lg:px-10 lg:py-10 max-w-7xl mx-auto">
        {/* Hero Banner de Bienvenida y Progreso */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-6 md:p-8 text-white shadow-xl mb-8">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-caption font-extrabold uppercase tracking-wider backdrop-blur-md text-blue-100">
              Panel de Aprendizaje
            </span>
            <h1 className="mt-3 text-display-sm md:text-display font-extrabold tracking-tight text-white">
              Mis Cursos de Inglés
            </h1>
            <p className="mt-2 text-body-sm md:text-body font-medium text-blue-100 leading-relaxed">
              Selecciona tu programa para acceder a las video-lecciones, ejercicios de pronunciación y tareas guiadas.
            </p>
          </div>

          {/* Decoración geométrica tecnológica */}
          <div className="absolute right-0 top-0 -mt-10 -mr-10 size-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="absolute right-20 bottom-0 size-48 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading-sm font-extrabold text-slate-900">
            Tus programas matriculados
          </h2>
          <span className="text-caption font-extrabold text-slate-500 tabular-nums">
            {courses.length} {courses.length === 1 ? 'curso disponible' : 'cursos disponibles'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CoursePickerCard key={c.id} course={c} onSelect={(selected) => setSelectedCourseId(selected.id)} />
          ))}
        </div>
      </div>
    );
  }

  if (isModulePending) {
    return (
      <div className="flex flex-col gap-4 px-5 py-4 lg:px-8 lg:py-6">
        <Skeleton className="aspect-video rounded-3xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  const courseSwitcher = (
    <div className="flex flex-wrap items-center justify-between gap-2.5 px-5 pt-3 lg:px-8">
      <button
        type="button"
        onClick={() => setSelectedCourseId('')}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-caption font-extrabold text-slate-700 shadow-sm transition-all hover:border-brand/40 hover:text-brand"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        <span>Volver a Mis cursos</span>
      </button>

      {allModules && allModules.length > 0 && (
        <button
          type="button"
          onClick={() => setUnitsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-3.5 py-1.5 text-caption font-extrabold text-brand shadow-sm hover:from-brand hover:to-indigo-600 hover:text-white transition-all"
        >
          <FolderTree aria-hidden size={15} />
          <span>Plan de estudios ({allModules.length} {allModules.length === 1 ? 'unidad' : 'unidades'})</span>
        </button>
      )}
    </div>
  );

  if (!effectiveModule) {
    return (
      <div className="flex flex-col gap-4">
        {courseSwitcher}
        <div className="px-5 py-8 lg:px-8 lg:py-12">
          <EmptyState
            title="Todavía no hay ninguna unidad publicada"
            description="Tu docente aún no ha creado contenido para este curso. Vuelve pronto."
          />
        </div>
      </div>
    );
  }

  const moduleLabel = effectiveModule.title;
  const lessonTitle = currentLesson?.title ?? moduleLabel;
  const lessonPosition = currentLesson ? lessons!.indexOf(currentLesson) + 1 : 0;
  const isLastModule = allModules ? allModules.at(-1)?.id === effectiveModule.id : false;

  // Todas las lecciones (video + archivos) del módulo ya están hechas —
  // decide qué mostrar: si queda una evaluación sin aprobar, ésa es la
  // acción pendiente real (antes esto saltaba directo al modal de "¡Termi-
  // naste el curso!" aunque la evaluación siguiera sin rendirse, con
  // "Ver certificado" habilitado por error). Sólo cuando no hay evaluación
  // pendiente se considera de verdad terminado el módulo.
  const onAllLessonsDone = () => {
    if (moduleQuiz && !hasPassedModuleQuiz) {
      setQuizTakeOpen(true);
    } else {
      setModuleCompleteOpen(true);
    }
  };

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
    if (wasLastPending) onAllLessonsDone();
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

  const goToPrevious =
    currentLesson && lessonPosition > 1
      ? () => {
          const prevLesson = lessons?.[lessonPosition - 2];
          if (!prevLesson) return;
          router.push(ROUTES.student.leccion(course.level.toLowerCase(), effectiveModule.id, prevLesson.order));
        }
      : undefined;

  // Un ítem sin reproductor (PDF/Audio/Ejercicio) no tiene "onEnded" que
  // avisar que el alumno terminó — a diferencia del video, acá SÍ hace
  // falta una acción explícita: hacer clic en "Siguiente lección" es esa
  // acción, así que recién ahí se marca visto (antes se marcaba solo al
  // llegar a la lección, sin que el alumno hiciera nada). `Evaluación`
  // queda fuera: su avance lo decide aprobar el quiz, no llegar al ítem.
  const goToNext = () => {
    if (!video.canAdvance) {
      toast('Debes terminar el video para continuar');
      return;
    }
    if (!currentLesson || !lessons) return;
    // Antes, sin lección siguiente, esto sólo mostraba un toast sin salida
    // ("Ya completaste todas las lecciones") — un callejón sin salida real
    // si quedaba la evaluación pendiente, o si ya estaba aprobada pero el
    // alumno volvió a revisitar la última lección. Ahora reevalúa qué falta
    // de verdad (evaluación pendiente → la abre; todo hecho → certificado).
    const advance = () => {
      const nextLesson = lessons[lessonPosition];
      if (!nextLesson) {
        onAllLessonsDone();
        return;
      }
      router.push(ROUTES.student.leccion(course.level.toLowerCase(), effectiveModule.id, nextLesson.order));
    };
    const isFileLesson = currentLesson.type !== 'Video' && currentLesson.type !== 'Evaluación';
    if (isFileLesson && currentLesson.state !== 'done') {
      // Antes esto seguía de largo (calculaba "¿ya terminé todo?" y hasta
      // navegaba) sin esperar a que el guardado realmente llegara al
      // servidor — si la mutación fallaba en silencio, el alumno veía
      // "¡Terminaste el curso!" aunque esta lección nunca hubiera quedado
      // guardada como vista. Ahora la decisión espera la confirmación real.
      markViewed.mutate(currentLesson.id, {
        onSuccess: () => {
          const others = lessons.filter((lesson) => lesson.id !== currentLesson.id);
          if (others.every((lesson) => lesson.state === 'done')) {
            onAllLessonsDone();
          } else {
            advance();
          }
        },
        onError: () => toast.error('No se pudo guardar tu avance. Intenta de nuevo.'),
      });
      return;
    }
    advance();
  };

  const nextLesson =
    lessons && lessonPosition > 0 && lessonPosition < lessons.length ? lessons[lessonPosition] : undefined;
  const nextLessonTitle = nextLesson
    ? nextLesson.title
    : moduleQuiz && !hasPassedModuleQuiz
      ? 'Evaluación de la unidad'
      : undefined;

  const playerElement =
    currentLesson?.type === 'Video' || !currentLesson ? (
      <VideoPlayer
        contextLabel={`Lección ${lessonPosition} de ${total} · ${moduleLabel}`}
        contextLabelShort={`Lección ${lessonPosition} · ${moduleLabel}`}
        lessonTitle={lessonTitle}
        nextLessonTitle={nextLessonTitle}
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
        isTheater={isTheater}
        onToggleTheater={() => setIsTheater((t) => !t)}
        onPrevious={goToPrevious}
        onNext={goToNext}
      />
    ) : (
      <LessonFileView
        contextLabel={`Lección ${lessonPosition} de ${total} · ${moduleLabel}`}
        contextLabelShort={`Lección ${lessonPosition} · ${moduleLabel}`}
        type={currentLesson.type}
        title={currentLesson.title}
        fileUrl={videoUrl}
        fileUrlPending={isVideoUrlPending}
        onPrevious={goToPrevious}
        onNext={goToNext}
      />
    );

  const lessonDetailsCard = (
    <div className={cn('px-5 lg:px-0', isTheater && 'w-full')}>
      <Card
        padding="lg"
        radius="xl"
        className="border border-slate-200/90 bg-white shadow-card p-6"
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="mt-0.5 hidden size-10 shrink-0 rounded-2xl sm:grid place-items-center text-white font-extrabold shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${avatarColorFor(effectiveModule.id)}, ${avatarColorFor(effectiveModule.id)}99)`,
            }}
          >
            {course.level}
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-micro font-extrabold tracking-widest text-brand uppercase">
              {moduleLabel}
            </span>
            <h1 className="mt-1 text-heading-sm font-black tracking-tight text-slate-900 text-pretty lg:text-heading">
              {lessonTitle}
            </h1>
          </div>
        </div>

        <ul className="mt-3.5 flex flex-wrap gap-2">
          <li className="rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-1 text-caption font-bold text-slate-600">
            ⏱ Duración: {currentLesson?.duration ?? '—'}
          </li>
          <li className="rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-1 text-caption font-bold text-slate-600">
            📊 Nivel: {course.level}
          </li>
          <li className="rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-1 text-caption font-bold text-brand">
            📚 {completed} de {total} completadas
          </li>
        </ul>

        <div className="mt-5 pt-4 border-t border-slate-100">
          <LessonTabs
            description={currentLesson?.description ?? null}
            transcript={currentLesson?.transcript ?? null}
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
  );

  const sidebarElement = (
    <aside className="flex flex-col gap-4 px-5 pb-5 lg:w-aside lg:shrink-0 lg:px-0 lg:pb-0">
      {isProgressPending && <Skeleton className="h-[220px] rounded-3xl" />}
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

      <Link href={ROUTES.student.foro(course.id)} className="group block focus-visible:outline-none">
        <Card
          variant="hover"
          padding="md"
          radius="xl"
          className="flex items-center gap-3 border border-slate-200 bg-white shadow-sm hover:border-brand/40"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-brand shadow-sm group-hover:bg-brand group-hover:text-white transition-colors">
            <MessagesSquare aria-hidden size={18} strokeWidth={2.2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body-sm font-extrabold text-slate-900 group-hover:text-brand transition-colors">
              Foro del curso
            </span>
            <span className="block text-caption font-medium text-slate-500">
              Preguntas y respuestas con tus compañeros
            </span>
          </span>
        </Card>
      </Link>

      {allModules && allModules.length > 1 && (
        <Card padding="md" radius="xl" className="border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-blue-50 text-brand">
                <Layers aria-hidden size={14} />
              </span>
              <p className="text-caption font-extrabold uppercase tracking-wider text-slate-700">
                Unidades del curso
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUnitsModalOpen(true)}
              className="text-[11px] font-extrabold text-brand hover:underline"
            >
              Ver temario →
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            {allModules.map((m, idx) => {
              const isSelected = m.id === effectiveModule.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setManualModuleId(m.id)}
                  className={cn(
                    'group flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition-all',
                    isSelected
                      ? 'border border-blue-200 bg-blue-50/90 text-brand shadow-sm font-black'
                      : 'border border-slate-100 hover:bg-slate-50 text-slate-700 font-bold',
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={cn(
                        'grid size-5 shrink-0 place-items-center rounded-md text-[10px] font-black',
                        isSelected ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500',
                      )}
                    >
                      {idx + 1}
                    </span>
                    <span className="truncate text-caption">{m.title}</span>
                  </div>
                  {isSelected && (
                    <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-brand">
                      Activa
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Card padding="lg" radius="xl" className="border border-slate-200 bg-white shadow-sm">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-body font-extrabold text-slate-900">Contenido de la unidad</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-micro font-extrabold text-slate-600 tabular-nums">
            {completed} / {total}
          </span>
        </div>

        {isPending && (
          <div className="flex flex-col gap-2">
            <LoadingRegion label="Cargando el contenido de la unidad" />
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        )}

        {lessons && lessons.length > 0 && (
          <LessonList
            lessons={lessons}
            quiz={quizState ? { state: quizState } : null}
            onSelect={(lesson) => {
              if (lesson.id === currentLesson?.id) return;
              router.push(
                ROUTES.student.leccion(
                  course?.level.toLowerCase() ?? 'b1',
                  effectiveModule.id,
                  lesson.order,
                ),
              );
            }}
            onSelectQuiz={() => setQuizTakeOpen(true)}
          />
        )}

        {lessons && lessons.length === 0 && !isPending && (
          <EmptyState
            compact
            title="Sin lecciones todavía"
            description="Esta unidad aún no tiene lecciones publicadas."
          />
        )}

        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-blue-50/50 p-3 border border-blue-100">
          <Lock
            aria-hidden
            size={16}
            className="mt-0.5 shrink-0 text-blue-600"
          />
          <span className="text-caption font-medium leading-relaxed text-blue-950">
            Las unidades se desbloquean al completar el 100% de la anterior. Tu progreso se guarda automáticamente.
          </span>
        </div>
      </Card>
    </aside>
  );

  return (
    <div className="flex flex-col gap-4">
      {courseSwitcher}

      {isTheater ? (
        <div className="flex flex-col gap-6">
          <div className="w-full px-5 lg:px-[30px]">{playerElement}</div>
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-8 lg:px-[30px] lg:pb-8">
            <div className="min-w-0 flex-1">{lessonDetailsCard}</div>
            {sidebarElement}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-5 lg:px-[30px] lg:py-6">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {playerElement}
            {lessonDetailsCard}
          </div>
          {sidebarElement}
        </div>
      )}

      <ModuleCompleteModal
        open={moduleCompleteOpen}
        onOpenChange={setModuleCompleteOpen}
        moduleTitle={moduleLabel}
        isLastModule={isLastModule}
        onViewCertificate={
          isLastModule && (!moduleQuiz || hasPassedModuleQuiz) && (progress ? progress.percent >= 100 : course.progress >= 100)
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
          moduleId={effectiveModule.id}
          moduleTitle={moduleLabel}
          onContinue={continueAfterModule}
        />
      )}

      {allModules && allModules.length > 0 && (
        <CourseUnitsModal
          open={unitsModalOpen}
          onOpenChange={setUnitsModalOpen}
          courseTitle={course.name}
          courseLevel={course.level}
          modules={allModules}
          activeModuleId={effectiveModule.id}
          onSelectLesson={(mod, les) => {
            setManualModuleId(mod.id);
            router.push(ROUTES.student.leccion(course.level.toLowerCase(), mod.id, les.order));
          }}
        />
      )}
    </div>
  );
}
