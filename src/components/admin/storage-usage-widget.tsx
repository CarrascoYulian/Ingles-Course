'use client';

import { useStorageUsage } from '@/features/content/hooks/use-storage-usage';
import { formatBytes } from '@/lib/format';
import { storageBarColor } from '@/lib/storage-color';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

/**
 * Uso real del bucket `course-files` — issue #39 (Fase 3). Antes era un
 * valor fijo del diseño («128 GiB de 200 GB usados»); ahora sale de
 * `/api/storage/usage`, que suma los objetos reales del bucket, y se
 * invalida automáticamente al subir o borrar un archivo (ver
 * `use-content-blocks.ts`/`use-courses.ts`), así que sube y baja solo sin
 * refrescar la página.
 *
 * El color de la barra es un degradado continuo (azul → ámbar → rojo, ver
 * `storageBarColor`), no un salto brusco entre dos colores fijos.
 */
export function StorageUsageWidget() {
  const { data, isPending, isError } = useStorageUsage();

  if (isPending || isError || !data) return null;

  const color = storageBarColor(data.usedPercent);

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-ink-raised px-3 py-2.5">
      <div className="flex items-center justify-between text-caption font-semibold text-ink-fg-dim">
        <span>Almacenamiento</span>
        <span
          className={cn('transition-colors duration-500', data.tier !== 'ok' && 'font-bold')}
          style={{ color }}
        >
          {data.usedPercent}%
        </span>
      </div>
      <Progress value={data.usedPercent} color={color} height={5} onInk label="Uso de almacenamiento" />
      <p className="text-micro text-ink-fg-dim">
        {formatBytes(data.usedBytes)} de {formatBytes(data.limitBytes)} usados
      </p>

      {data.byCourse.length > 0 && (
        <ul className="flex flex-col gap-1 border-t border-white/10 pt-2">
          {data.byCourse.slice(0, 3).map((course) => (
            <li
              key={course.courseId}
              className="flex items-center justify-between gap-2 text-micro text-ink-fg-dim"
            >
              <span className="min-w-0 truncate">{course.courseName}</span>
              <span className="shrink-0 tabular-nums">{formatBytes(course.bytes)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
