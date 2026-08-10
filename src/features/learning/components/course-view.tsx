'use client';

import { Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Eyebrow } from '@/components/shared/section-title';
import { LessonList } from '@/components/student/lesson-list';
import { LessonTabs } from '@/components/student/lesson-tabs';
import { ProgressCard } from '@/components/student/progress-card';
import { VideoPlayer } from '@/components/student/video-player';
import { Card } from '@/components/ui/card';
import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import {
  useCurrentModule,
  useLessonVideoUrl,
  useMyCourses,
  useModuleLessons,
  useMyProgress,
} from '../hooks/use-learning';
import { useVideoProgress } from '../hooks/use-video-progress';

export interface CourseViewProps {
  /** `order` de la lección pedida por la URL — si no llega, se usa la "actual". */
  lessonOrder?: number;
}

export function CourseView({ lessonOrder }: CourseViewProps = {}) {
  const router = useRouter();

  // Antes esta pantalla resolvía "el" módulo global sin importar en qué
  // curso(s) estuviera matriculado el alumno — con más de un curso en la
  // base, cualquier estudiante podía terminar viendo contenido de un curso
  // ajeno. Ahora se resuelve primero a qué curso(s) pertenece de verdad.
  const { data: courses, isPending: isCoursesPending } = useMyCourses();
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const syncedCourses = useRef(false);
  useEffect(() => {
    if (!courses || syncedCourses.current) return;
    syncedCourses.current = true;
    setSelectedCourseId(courses[0]?.id ?? '');
  }, [courses]);

  const course = courses?.find((c) => c.id === selectedCourseId);
  const { data: module, isPending: isModulePending } = useCurrentModule(selectedCourseId);
  const { data: lessons, isPending } = useModuleLessons(module?.id ?? '');
  const { data: progress, isPending: isProgressPending } = useMyProgress();

  // Antes esta pantalla ignoraba por completo el parámetro `leccion-N` de su
  // propia URL y siempre mostraba "la lección actual" calculada por dentro
  // — un enlace compartido a la lección 2 abría la lección 5 igual. Si la
  // URL trae un `order` válido se respeta; si no, se cae a la actual.
  const requestedLesson = lessons?.find((lesson) => lesson.order === lessonOrder);
  const currentLesson = requestedLesson ?? lessons?.find((lesson) => lesson.state === 'current');
  const durationMinutes = currentLesson ? parseInt(currentLesson.duration, 10) : undefined;
  const { data: videoUrl } = useLessonVideoUrl(currentLesson?.mediaKey ?? null);
  const video = useVideoProgress(
    currentLesson?.id ?? '',
    currentLesson?.watchedPercent ?? 0,
    durationMinutes && Number.isFinite(durationMinutes) ? durationMinutes * 60 : undefined,
    currentLesson?.mediaKey != null,
  );

  const completed = lessons?.filter((lesson) => lesson.state === 'done').length ?? 0;
  const total = lessons?.length ?? 0;

  if (isCoursesPending || isModulePending) {
    return (
      <div className="flex flex-col gap-4 px-5 py-4 lg:px-[30px] lg:py-6">
        <Skeleton className="aspect-video rounded-9xl" />
        <Skeleton className="h-40 rounded-8xl" />
      </div>
    );
  }

  // Sin matrícula no hay ningún curso que mostrar — antes esto no se
  // distinguía de "el curso todavía no tiene módulos".
  if (!course) {
    return (
      <div className="px-5 py-8 lg:px-[30px] lg:py-12">
        <EmptyState
          title="Todavía no estás matriculado en ningún curso"
          description="Escribe a tu docente para que te matricule y puedas empezar."
        />
      </div>
    );
  }

  const courseSwitcher = courses && courses.length > 1 && (
    <ChipRow label="Mis cursos" className="px-5 pt-4 lg:px-0 lg:pt-0">
      {courses.map((c) => (
        <Chip
          key={c.id}
          active={c.id === selectedCourseId}
          onClick={() => setSelectedCourseId(c.id)}
        >
          {c.name}
        </Chip>
      ))}
    </ChipRow>
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

  return (
    <div className="flex flex-col gap-4">
      {courseSwitcher}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-5 lg:px-[30px] lg:py-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <VideoPlayer
            contextLabel={`Lección ${lessonPosition} de ${total} · ${moduleLabel}`}
            contextLabelShort={`Lección ${lessonPosition} · ${moduleLabel}`}
            watched={video.watched}
            playing={video.playing}
            timeLabel={video.timeLabel}
            canAdvance={video.canAdvance}
            onToggle={video.toggle}
            src={videoUrl}
            onProgress={video.onProgress}
            onEnded={video.onEnded}
            onNext={() =>
              toast(
                video.canAdvance
                  ? 'Siguiente lección desbloqueada · progreso guardado'
                  : 'Debes terminar el video para continuar',
              )
            }
          />

          <div className="px-5 lg:px-0">
            <Card
              padding="none"
              radius="xl"
              className="max-lg:border-0 max-lg:bg-transparent lg:px-6 lg:py-[22px]"
            >
              <Eyebrow>{moduleLabel.toUpperCase()}</Eyebrow>
              <h1 className="mt-[5px] text-heading-sm font-extrabold tracking-heading text-fg text-pretty lg:mt-1.5 lg:text-heading-lg">
                {lessonTitle}
              </h1>
              <div className="mt-3.5 lg:mt-[18px]">
                <LessonTabs />
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
            />
          )}

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
    </div>
  );
}
