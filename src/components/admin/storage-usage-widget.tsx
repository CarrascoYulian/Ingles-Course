'use client';

import { useStorageUsage } from '@/features/content/hooks/use-storage-usage';
import { formatBytes } from '@/lib/format';
import { Progress } from '@/components/ui/progress';

/**
 * Uso real del bucket `course-files` — issue #39 (Fase 3). Antes era un
 * valor fijo del diseño («128 GiB de 200 GB usados»); ahora sale de
 * `/api/storage/usage`, que suma los objetos reales del bucket.
 */
export function StorageUsageWidget() {
  const { data, isPending, isError } = useStorageUsage();

  if (isPending || isError || !data) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-ink-raised px-3 py-2.5">
      <div className="flex items-center justify-between text-caption font-semibold text-ink-fg-dim">
        <span>Almacenamiento</span>
        <span className={data.nearLimit ? 'text-warning' : undefined}>{data.usedPercent}%</span>
      </div>
      <Progress
        value={data.usedPercent}
        tone={data.nearLimit ? 'warning' : 'accent'}
        height={5}
        onInk
        label="Uso de almacenamiento"
      />
      <p className="text-micro text-ink-fg-dim">
        {formatBytes(data.usedBytes)} de {formatBytes(data.limitBytes)} usados
      </p>
    </div>
  );
}
