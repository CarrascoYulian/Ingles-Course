'use client';

import { useState } from 'react';

import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { BarChart, Sparkline } from '@/components/dashboard/bar-chart';
import { PublishedCoursesCard } from '@/components/dashboard/published-courses-card';
import { StatCard } from '@/components/dashboard/stat-card';
import { CreateCourseDialog } from '@/components/admin/create-course-dialog';
import { SectionTitle } from '@/components/shared/section-title';
import { Card } from '@/components/ui/card';
import { Chip, ChipRow } from '@/components/ui/chip';
import { Progress } from '@/components/ui/progress';
import { useAdminHeader } from '@/components/admin/admin-shell';
import { useCourses, useCreateCourse, useTogglePublished } from '@/features/courses/hooks/use-courses';
import { useDashboardMetrics, useRecentActivity } from '../hooks/use-analytics';
import { DashboardSkeleton } from './dashboard-skeleton';

export function DashboardView() {
  const [selectedRange, setSelectedRange] = useState<'30d' | '7d' | 'all'>('30d');
  const [selectedLevel, setSelectedLevel] = useState<string>('Todos');
  const [onlyActive, setOnlyActive] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const metrics = useDashboardMetrics();
  const activity = useRecentActivity();
  const courses = useCourses();
  const createCourse = useCreateCourse();
  const togglePublished = useTogglePublished();

  useAdminHeader(
    metrics.data
      ? `${metrics.data.totalStudents} estudiante${metrics.data.totalStudents === 1 ? '' : 's'} matriculado${metrics.data.totalStudents === 1 ? '' : 's'}`
      : 'Cargando…',
    () => setDialogOpen(true),
  );

  if (!metrics.data) return <DashboardSkeleton />;

  const { activeStudents, averageProgress, watchedHours, library, weeklyLessons } = metrics.data;

  return (
    <div className="flex flex-col gap-3.5 px-5 py-4 md:gap-5 lg:px-[30px] lg:py-6">
      <ChipRow label="Filtros del resumen" className="lg:gap-2 flex-wrap">
        <span className="mr-1 hidden shrink-0 text-meta font-bold text-fg-dim lg:inline">
          Filtros
        </span>
        <Chip active={selectedRange === '30d'} onClick={() => setSelectedRange('30d')}>
          Últimos 30 días
        </Chip>
        <Chip active={selectedRange === '7d'} onClick={() => setSelectedRange('7d')}>
          Últimos 7 días
        </Chip>
        <Chip active={selectedLevel === 'Todos'} onClick={() => setSelectedLevel('Todos')}>
          Todos los niveles
        </Chip>
        {['A1', 'A2', 'B1', 'B2', 'C1'].map((lvl) => (
          <Chip
            key={lvl}
            active={selectedLevel === lvl}
            onClick={() => setSelectedLevel(selectedLevel === lvl ? 'Todos' : lvl)}
            className="hidden sm:inline-flex"
          >
            Nivel {lvl}
          </Chip>
        ))}
        <Chip active={onlyActive} onClick={() => setOnlyActive((v) => !v)}>
          Solo activos
        </Chip>
      </ChipRow>

      <section aria-label="Indicadores clave" className="grid grid-cols-2 gap-[11px] xl:grid-cols-4 xl:gap-3.5">
        <StatCard
          label="Estudiantes activos"
          value={String(activeStudents.value)}
          delta={{ label: activeStudents.deltaLabel }}
          visual={
            <Progress value={activeStudents.ratio} className="hidden xl:block" />
          }
          caption={activeStudents.caption}
          className="[&_p:last-child]:hidden xl:[&_p:last-child]:block"
        />
        <StatCard
          label="Progreso promedio"
          value={`${averageProgress.value} %`}
          delta={{ label: averageProgress.deltaLabel }}
          visual={
            <Progress value={averageProgress.value} tone="accent" className="hidden xl:block" />
          }
          caption={averageProgress.caption}
          className="[&_p:last-child]:hidden xl:[&_p:last-child]:block"
        />
        <StatCard
          label="Horas vistas"
          value={watchedHours.value}
          delta={{ label: watchedHours.deltaLabel }}
          visual={<Sparkline values={watchedHours.sparkline} className="hidden xl:flex" />}
        />
        <StatCard
          label="Biblioteca publicada"
          value={String(library.courses)}
          delta={{ label: 'cursos', tone: 'neutral' }}
          visual={
            <dl className="hidden gap-3.5 xl:flex">
              <div>
                <dd className="text-title font-extrabold text-fg">{library.modules}</dd>
                <dt className="text-micro font-semibold text-fg-ghost">unidades</dt>
              </div>
              <div>
                <dd className="text-title font-extrabold text-fg">{library.videos}</dd>
                <dt className="text-micro font-semibold text-fg-ghost">videos</dt>
              </div>
              <div>
                <dd className="text-title font-extrabold text-warning">{library.drafts}</dd>
                <dt className="text-micro font-semibold text-fg-ghost">borradores</dt>
              </div>
            </dl>
          }
        />
      </section>

      <Card padding="lg" radius="xl">
        <SectionTitle
          title="Lecciones completadas por semana"
          description="Comparado con el trimestre anterior"
          aside={
            <ul className="hidden gap-3 text-tiny font-semibold text-fg-dim md:flex">
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-sm bg-brand" />
                2026
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-sm bg-line-chart" />
                2025
              </li>
            </ul>
          }
        />
        <BarChart
          data={weeklyLessons}
          caption="Lecciones completadas por semana, 2026 frente a 2025"
          height={180}
          showLabels
          className="mt-[22px]"
        />
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {activity.data && <ActivityFeed events={activity.data} />}
        {courses.data && (
          <PublishedCoursesCard
            courses={courses.data.slice(0, 3)}
            onPublish={(course) =>
              togglePublished.mutate({ id: course.id, published: true })
            }
          />
        )}
      </div>

      <CreateCourseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(values) => createCourse.mutateAsync(values).then(() => undefined)}
        pending={createCourse.isPending}
      />
    </div>
  );
}
