'use client';

import { toast } from 'sonner';

import { PageHeader } from '@/components/shared/page-header';
import { ResourceRow } from '@/components/student/resource-row';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { useResources } from '../hooks/use-learning';

export function ResourcesView() {
  const { data: resources, isPending } = useResources();

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-3 px-5 py-5 lg:gap-3.5 lg:px-[30px] lg:py-[26px]">
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

      {resources && resources.length > 0 && (
        <ul className="flex flex-col gap-2.5 lg:gap-3.5">
          {resources.map((resource) => (
            <ResourceRow
              key={resource.id}
              resource={resource}
              onDownload={(target) => toast(`Descargando ${target.title}…`)}
            />
          ))}
        </ul>
      )}

      {resources?.length === 0 && (
        <EmptyState
          title="Todavía no hay material descargable"
          description="Los recursos se desbloquean a medida que completas los módulos."
        />
      )}
    </div>
  );
}
