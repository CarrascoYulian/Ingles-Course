'use client';

import { useState } from 'react';

import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { BarChart, Sparkline } from '@/components/dashboard/bar-chart';
import { Leaderboard } from '@/components/dashboard/leaderboard';
import { PublishedCoursesCard } from '@/components/dashboard/published-courses-card';
import { StatCard } from '@/components/dashboard/stat-card';
import { CreateCourseDialog } from '@/components/admin/create-course-dialog';
import { SectionTitle } from '@/components/shared/section-title';
import { Card } from '@/components/ui/card';
import { Chip, ChipRow } from '@/components/ui/chip';
import { Progress } from '@/components/ui/progress';
import { useAdminHeader } from '@/components/admin/admin-shell';
import { useCourses, useCreateCourse, useTogglePublished } from '@/features/courses/hooks/use-courses';
import {
  useDashboardMetrics,
  useLeaderboard,
  useRecentActivity,
} from '../hooks/use-analytics';
import { DashboardSkeleton } from './dashboard-skeleton';

const FILTERS = [
  { id: 'range', label: 'Últimos 30 días', shortLabel: '30 días', initial: true, desktopOnly: false },
  { id: 'level', label: 'Nivel B1', shortLabel: 'Nivel B1', initial: false, desktopOnly: false },
  {
    id: 'course',
    label: 'Curso: Inglés conversacional',
    shortLabel: 'Curso',
    initial: false,
    desktopOnly: true,
  },
  { id: 'active', label: 'Solo activos', shortLabel: 'Activos', initial: true, desktopOnly: false },
] as const;

export function DashboardView() {
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>(
    Object.fromEntries(FILTERS.map((f) => [f.id, f.initial])),
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  const metrics = useDashboardMetrics();
  const activity = useRecentActivity();
  const leaderboard = useLeaderboard();
  const courses = useCourses();
  const createCourse = useCreateCourse();
  const togglePublished = useTogglePublished();

  // Antes decía siempre "342 estudiantes matriculados", sin importar
  // cuántos hubiera realmente — y "hace 4 minutos" nunca cambiaba. Ahora
  // usa el total real (`totalStudents`, de la misma consulta agregada que
  // ya alimenta el resto del dashboard) y omite la marca de tiempo en vez
  // de inventar una.
  useAdminHeader(
    metrics.data
      ? `${metrics.data.totalStudents} estudiante${metrics.data.totalStudents === 1 ? '' : 's'} matriculado${metrics.data.totalStudents === 1 ? '' : 's'}`
      : 'Cargando…',
    () => setDialogOpen(true),
  );

  if (!metrics.data) return <DashboardSkeleton />;

  const { activeStudents, averageProgress, watchedHours, library, weeklyLessons, totalStudents } =
    metrics.data;

  return (
    <div className="flex flex-col gap-3.5 px-5 py-4 md:gap-5 lg:px-[30px] lg:py-6">
      <ChipRow label="Filtros del resumen" className="lg:gap-2">
        <span className="mr-1 hidden shrink-0 text-meta font-bold text-fg-dim lg:inline">
          Filtros
        </span>
        {FILTERS.map((filter) => (
          <Chip
            key={filter.id}
            active={activeFilters[filter.id] ?? false}
            onClick={() =>
              setActiveFilters((current) => ({ ...current, [filter.id]: !current[filter.id] }))
            }
            className={filter.desktopOnly ? 'hidden lg:inline-flex' : undefined}
          >
            <span className="lg:hidden">{filter.shortLabel}</span>
            <span className="hidden lg:inline">{filter.label}</span>
          </Chip>
        ))}
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
                <dt className="text-micro font-semibold text-fg-ghost">módulos</dt>
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

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
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

        {leaderboard.data && (
          <Leaderboard entries={leaderboard.data} totalStudents={totalStudents} />
        )}
      </div>

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
