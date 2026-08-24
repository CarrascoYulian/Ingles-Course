'use client';

import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useAdminHeader } from '@/components/admin/admin-shell';
import { StudentPerformanceRow } from '@/components/admin/student-performance-row';
import { BarChart } from '@/components/dashboard/bar-chart';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { SectionTitle } from '@/components/shared/section-title';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { CEFR_LEVELS, type CefrLevel, type ReportRange } from '@/types';
import { useReport, useStudentPerformance } from '../hooks/use-analytics';

const RANGES: ReportRange[] = ['7 días', '30 días', 'Trimestre', 'Año'];
const PERIOD_LABELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
const LEVEL_FILTERS: Array<CefrLevel | 'Todos'> = ['Todos', ...CEFR_LEVELS];

/**
 * Antes esto sólo mostraba un toast de éxito falso — no generaba ningún
 * archivo. Ahora pide el CSV real de progreso por estudiante al servidor y
 * el toast de éxito sólo aparece si la descarga de verdad se completó.
 */
async function exportStudentsCsv(): Promise<void> {
  const response = await fetch('/api/analytics/export/csv');
  if (!response.ok) {
    toast.error('No se pudo generar el CSV. Inténtalo de nuevo.');
    return;
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filename = /filename="(.+)"/.exec(disposition)?.[1] ?? 'reportes.csv';

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);

  toast(`CSV descargado · ${filename}`);
}

export function ReportsView() {
  const [range, setRange] = useState<ReportRange>('30 días');
  const { data: report, isPending } = useReport(range);

  // Búsqueda/filtro propios de esta sección — a propósito NO se usa
  // `useAdminSearch` (esa es la del topbar, sólo wireada para
  // /admin/estudiantes y /admin/cursos).
  const [performanceQuery, setPerformanceQuery] = useState('');
  const [performanceLevel, setPerformanceLevel] = useState<CefrLevel | 'Todos'>('Todos');
  const [performancePage, setPerformancePage] = useState(1);
  useEffect(() => setPerformancePage(1), [performanceQuery, performanceLevel]);

  const performance = useStudentPerformance({
    query: performanceQuery,
    level: performanceLevel,
    page: performancePage,
  });
  const performanceTotalPages = performance.data
    ? Math.max(1, Math.ceil(performance.data.total / performance.data.pageSize))
    : 1;

  useAdminHeader(`Rango: ${range} · exportable a CSV`, exportStudentsCsv);

  return (
    <div className="flex flex-col gap-3 px-5 py-4 lg:gap-4 lg:px-[30px] lg:py-6">
      <ChipRow label="Rango del reporte">
        <span className="mr-1 hidden shrink-0 text-meta font-bold text-fg-dim lg:inline">
          Rango
        </span>
        {RANGES.map((option) => (
          <Chip key={option} active={range === option} onClick={() => setRange(option)}>
            {option}
          </Chip>
        ))}
      </ChipRow>

      {isPending && !report && (
        <>
          <LoadingRegion label="Cargando el reporte" />
          <Skeleton className="h-[300px] rounded-8xl" />
        </>
      )}

      {report && (
        <>
          <Card padding="none" radius="xl" className="px-[18px] py-[17px] lg:px-6 lg:py-[22px]">
            <SectionTitle
              title={`Horas vistas · ${report.range}`}
              description="Agrupado por periodo · todos los cursos publicados"
              aside={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportStudentsCsv}
                  className="hidden lg:inline-flex"
                >
                  Exportar CSV
                </Button>
              }
            />
            <BarChart
              data={report.bars.map((value, index) => ({
                label: PERIOD_LABELS[index] ?? `P${index + 1}`,
                current: value,
              }))}
              caption={`Horas vistas por periodo · ${report.range}`}
              height={200}
              className="mt-4 lg:mt-[22px]"
            />
          </Card>

          <div className="grid gap-3.5 lg:grid-cols-3">
            <Card className="max-lg:hidden">
              <p className="text-meta font-semibold text-fg-dim">Retención mensual</p>
              <p className="mt-1.5 text-display-sm font-extrabold tracking-display text-fg">
                {report.retention.value}
              </p>
              <p className="mt-0.5 text-tiny font-bold text-success">{report.retention.delta}</p>
            </Card>

            <Card>
              <p className="text-tiny font-semibold text-fg-dim lg:text-meta">
                Lección con más abandono
              </p>
              <p className="mt-1.5 text-body-lg font-extrabold tracking-tight-2 text-fg lg:mt-2 lg:text-title-xs">
                {report.dropOff.lesson}
              </p>
              <p className="mt-[3px] text-tiny font-bold text-danger lg:mt-1">
                {report.dropOff.rate}
              </p>
            </Card>

            <Card variant="ink" className="max-lg:hidden">
              <p className="text-meta font-semibold text-ink-fg-soft">Recomendación</p>
              <p className="mt-2 text-body font-bold leading-[1.45] text-white">
                {report.recommendation}
              </p>
            </Card>
          </div>

          <Button size="block" onClick={exportStudentsCsv} className="lg:hidden">
            Exportar CSV
          </Button>
        </>
      )}

      <Card padding="md" radius="xl">
        <SectionTitle
          title="Rendimiento por alumno"
          description="Calificaciones acumuladas de evaluaciones por unidad — sólo aquí, no en el dashboard general"
        />

        <div className="mt-3.5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <Input
            icon={<Search size={15} strokeWidth={2} />}
            placeholder="Buscar por nombre o matrícula"
            aria-label="Buscar alumno"
            value={performanceQuery}
            onChange={(event) => setPerformanceQuery(event.target.value)}
            className="sm:max-w-[260px]"
          />
          <ChipRow label="Filtrar por nivel" className="flex-wrap">
            {LEVEL_FILTERS.map((option) => (
              <Chip
                key={option}
                active={performanceLevel === option}
                onClick={() => setPerformanceLevel(option)}
              >
                {option}
              </Chip>
            ))}
          </ChipRow>
        </div>

        {performance.isPending && (
          <div className="mt-3 flex flex-col gap-2">
            <LoadingRegion label="Cargando el rendimiento por alumno" />
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[62px] rounded-3xl" />
            ))}
          </div>
        )}

        {performance.data && performance.data.items.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {performance.data.items.map((student) => (
              <StudentPerformanceRow key={student.id} student={student} />
            ))}
          </ul>
        )}

        {performance.data && performance.data.items.length === 0 && (
          <EmptyState
            title="Sin resultados para tu búsqueda"
            description="Prueba con otro nombre, la matrícula completa o quita el filtro de nivel."
            className="mt-3"
          />
        )}

        {performance.data && performance.data.total > performance.data.pageSize && (
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
            <p className="text-tiny font-bold text-fg-ghost">
              Página {performancePage} de {performanceTotalPages} · {performance.data.total} alumnos
            </p>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="xs"
                disabled={performancePage <= 1}
                onClick={() => setPerformancePage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="ghost"
                size="xs"
                disabled={performancePage >= performanceTotalPages}
                onClick={() => setPerformancePage((p) => Math.min(performanceTotalPages, p + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
