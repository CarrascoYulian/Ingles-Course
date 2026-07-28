import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';

/**
 * El esqueleto reproduce la retícula real (4 KPI + 2 columnas). Un spinner
 * genérico haría saltar el layout al llegar los datos.
 */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-3.5 px-5 py-4 md:gap-5 lg:px-[30px] lg:py-6">
      <LoadingRegion label="Cargando el resumen general" />

      <div className="flex gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-pill" />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-[11px] xl:grid-cols-4 xl:gap-3.5">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[118px] rounded-6xl" />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Skeleton className="h-[320px] rounded-8xl" />
        <Skeleton className="h-[320px] rounded-8xl" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[240px] rounded-8xl" />
        <Skeleton className="h-[240px] rounded-8xl" />
      </div>
    </div>
  );
}
