import { cn } from '@/lib/utils';

export interface BarChartSeries {
  label: string;
  /** Valores normalizados 0-100. */
  current: number;
  previous?: number;
}

export interface BarChartProps {
  data: BarChartSeries[];
  /** Descripción del conjunto para lectores de pantalla. */
  caption: string;
  height?: 96 | 110 | 180 | 200;
  showLabels?: boolean;
  className?: string;
}

const HEIGHT_CLASS = {
  96: 'h-24',
  110: 'h-[110px]',
  180: 'h-[180px]',
  200: 'h-[200px]',
} as const;

/**
 * Gráfico de barras en CSS puro. No se carga una librería de gráficos para
 * cinco rectángulos: son ~60 bytes de DOM frente a ~50 kB de JavaScript, y
 * escalan solos con el contenedor.
 *
 * La accesibilidad no depende del dibujo: hay una tabla equivalente oculta.
 */
export function BarChart({
  data,
  caption,
  height = 180,
  showLabels = false,
  className,
}: BarChartProps) {
  const hasComparison = data.some((d) => typeof d.previous === 'number');

  return (
    <figure className={cn('m-0', className)}>
      <div
        aria-hidden
        className={cn(
          'flex items-end gap-1.5 md:gap-2.5',
          HEIGHT_CLASS[height],
          showLabels && 'border-b border-line-soft pb-6',
        )}
      >
        {data.map((item) => (
          <div key={item.label} className="flex h-full flex-1 items-end gap-[3px]">
            {typeof item.previous === 'number' && (
              <span
                className="flex-1 rounded-t bg-line-chart"
                style={{ height: `${item.previous}%` }}
              />
            )}
            <span
              className="flex-1 rounded-t bg-brand transition-[height] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ height: `${item.current}%` }}
            />
          </div>
        ))}
      </div>

      {showLabels && (
        <div
          aria-hidden
          className="mt-2.5 flex justify-between text-caption font-semibold text-fg-ghost"
        >
          {data.map((item) => (
            <span key={item.label}>{item.label}</span>
          ))}
        </div>
      )}

      <figcaption className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Periodo</th>
              {hasComparison && <th scope="col">Anterior</th>}
              <th scope="col">Actual</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.label}>
                <th scope="row">{item.label}</th>
                {hasComparison && <td>{item.previous ?? '—'}</td>}
                <td>{item.current}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}

/** Mini-gráfico dentro de un KPI. Sin ejes ni etiquetas. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const peak = Math.max(...values);
  return (
    <div aria-hidden className={cn('flex h-[26px] items-end gap-[3px]', className)}>
      {values.map((value, index) => (
        <span
          key={index}
          className={cn('flex-1 rounded-sm', value >= peak * 0.8 ? 'bg-brand' : 'bg-line-chart')}
          style={{ height: `${value}%` }}
        />
      ))}
    </div>
  );
}
