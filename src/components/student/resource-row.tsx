'use client';

import { SquareBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CourseResource } from '@/types';

export function ResourceRow({
  resource,
  onDownload,
}: {
  resource: CourseResource;
  onDownload: (resource: CourseResource) => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-4xl border border-line bg-surface p-3.5 transition-colors duration-[160ms] hover:border-fg-placeholder md:gap-3.5 md:rounded-5xl md:px-[18px] md:py-[15px]">
      <SquareBadge size={42} className="bg-surface-sunken text-fg-subtle">
        {resource.type}
      </SquareBadge>

      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-bold text-fg md:text-body">{resource.title}</p>
        <p className="mt-0.5 truncate text-caption font-semibold text-fg-ghost md:text-tiny">
          {resource.meta}
        </p>
      </div>

      <Button variant="ghost" size="sm" onClick={() => onDownload(resource)}>
        <span className="md:hidden">Bajar</span>
        <span className="hidden md:inline">Descargar</span>
      </Button>
    </li>
  );
}
