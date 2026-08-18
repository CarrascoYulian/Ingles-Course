'use client';

import { Eyebrow } from '@/components/shared/section-title';
import { PageHeader } from '@/components/shared/page-header';
import { ResourceRow } from '@/components/student/resource-row';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { useOpenResource, useResourcesByCourse } from '../hooks/use-learning';

/**
 * Biblioteca de recursos del alumno — antes mostraba TODOS los recursos de
 * TODOS los cursos matriculados mezclados en una sola lista, sin distinguir
 * de dónde venía cada uno. Ahora se segmenta automáticamente por curso
 * matriculado (`useResourcesByCourse`): no hay ningún selector manual que
 * el alumno pueda cambiar, cada curso muestra sólo su propio material.
 */
export function ResourcesView() {
  const { groups, isPending } = useResourcesByCourse();
  const openResource = useOpenResource();
  const hasAnyResource = groups.some((group) => group.resources.length > 0);

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-5 px-5 py-5 lg:gap-6 lg:px-[30px] lg:py-[26px]">
      <PageHeader
        title="Recursos del curso"
        description="Material descargable de los módulos que ya desbloqueaste."
      />

      {isPending && (
        <>
          <LoadingRegion label="Cargando recursos" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[74px] rounded-5xl" />
          ))}
        </>
      )}

      {!isPending && groups.length > 1 && groups.map(({ course, resources }) =>
        resources.length > 0 ? (
          <div key={course.id} className="flex flex-col gap-2.5 lg:gap-3.5">
            <Eyebrow>{course.name}</Eyebrow>
            <ul className="flex flex-col gap-2.5 lg:gap-3.5">
              {resources.map((resource) => (
                <ResourceRow
                  key={resource.id}
                  resource={resource}
                  onDownload={(target) => target.mediaKey && openResource.mutate(target.mediaKey)}
                />
              ))}
            </ul>
          </div>
        ) : null,
      )}

      {!isPending && groups.length <= 1 && (
        <ul className="flex flex-col gap-2.5 lg:gap-3.5">
          {(groups[0]?.resources ?? []).map((resource) => (
            <ResourceRow
              key={resource.id}
              resource={resource}
              onDownload={(target) => target.mediaKey && openResource.mutate(target.mediaKey)}
            />
          ))}
        </ul>
      )}

      {!isPending && !hasAnyResource && (
        <EmptyState
          title="Todavía no hay material descargable"
          description="Los recursos se desbloquean a medida que completas los módulos."
        />
      )}
    </div>
  );
}
