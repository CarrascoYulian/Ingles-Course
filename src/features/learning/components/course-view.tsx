'use client';

import { Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Eyebrow } from '@/components/shared/section-title';
import { LessonList } from '@/components/student/lesson-list';
import { LessonTabs } from '@/components/student/lesson-tabs';
import { ProgressCard } from '@/components/student/progress-card';
import { VideoPlayer } from '@/components/student/video-player';
import { Card } from '@/components/ui/card';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import { useCurrentModule, useModuleLessons } from '../hooks/use-learning';
import { useVideoProgress } from '../hooks/use-video-progress';

const CURRENT_LESSON_ID = 'l5';

export function CourseView() {
  const router = useRouter();
  const { data: module } = useCurrentModule();
  const { data: lessons, isPending } = useModuleLessons(module?.id ?? '');
  const video = useVideoProgress(CURRENT_LESSON_ID);

  const completed = lessons?.filter((lesson) => lesson.state === 'done').length ?? 0;
  const total = lessons?.length ?? 0;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-5 lg:px-[30px] lg:py-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <VideoPlayer
          contextLabel="Lección 5 de 9 · Módulo 4"
          contextLabelShort="Lección 5 · Mód. 4"
          watched={video.watched}
          playing={video.playing}
          timeLabel={video.timeLabel}
          canAdvance={video.canAdvance}
          onToggle={video.toggle}
          onNext={() =>
            toast(
              video.canAdvance
                ? 'Lección 6 desbloqueada · progreso guardado'
                : 'Debes terminar el video para continuar',
            )
          }
        />

        <div className="px-5 lg:px-0">
          <Card padding="none" radius="xl" className="max-lg:border-0 max-lg:bg-transparent lg:px-6 lg:py-[22px]">
            <Eyebrow>MÓDULO 4 · TIEMPOS PERFECTOS</Eyebrow>
            <h1 className="mt-[5px] text-heading-sm font-extrabold tracking-heading text-fg text-pretty lg:mt-1.5 lg:text-heading-lg">
              Present Perfect vs. Past Simple
            </h1>
            <div className="mt-3.5 lg:mt-[18px]">
              <LessonTabs />
            </div>
          </Card>
        </div>
      </div>

      <aside className="flex flex-col gap-3.5 px-5 pb-5 lg:w-aside lg:shrink-0 lg:px-0 lg:pb-0">
        <ProgressCard percent={54} level="B1" hours={18} lessons={41} badges={7} />

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

          {lessons && (
            <LessonList
              lessons={lessons}
              onSelect={(lesson) => {
                if (lesson.state === 'current') return;
                router.push(ROUTES.student.leccion('b1', 'modulo-4', lesson.order));
              }}
            />
          )}

          <p className="mt-3.5 flex items-start gap-[11px] rounded-2xl bg-surface-muted p-[13px]">
            <Lock aria-hidden size={16} strokeWidth={1.9} className="mt-px shrink-0 text-fg-faint" />
            <span className="text-meta font-semibold leading-normal text-fg-soft">
              El Módulo 5 se abre al terminar el 100 % de este módulo. Tu avance se guarda solo.
            </span>
          </p>
        </Card>
      </aside>
    </div>
  );
}
