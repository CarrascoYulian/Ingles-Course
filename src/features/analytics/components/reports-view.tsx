'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { useAdminHeader } from '@/components/admin/admin-shell';
import { BarChart } from '@/components/dashboard/bar-chart';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipRow } from '@/components/ui/chip';
import { SectionTitle } from '@/components/shared/section-title';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import type { ReportRange } from '@/types';
import { useReport } from '../hooks/use-analytics';

const RANGES: ReportRange[] = ['7 días', '30 días', 'Trimestre', 'Año'];
const PERIOD_LABELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];

export function ReportsView() {
  const [range, setRange] = useState<ReportRange>('30 días');
  const { data: report, isPending } = useReport(range);

  const exportCsv = () =>
    toast(`Reporte exportado a reportes-${range.replace(' ', '')}.csv`);

  useAdminHeader(`Rango: ${range} · exportable a CSV`, exportCsv);

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
                  onClick={exportCsv}
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

          <Button size="block" onClick={exportCsv} className="lg:hidden">
            Exportar CSV
          </Button>
        </>
      )}
    </div>
  );
}
