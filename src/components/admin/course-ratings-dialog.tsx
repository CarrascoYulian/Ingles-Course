'use client';

import { Star } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useCourseRatings } from '@/features/analytics/hooks/use-analytics';
import { cn } from '@/lib/utils';

export interface CourseRatingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string | null;
  courseName: string | null;
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5 text-warning">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden size={14} strokeWidth={1.8} fill={n <= Math.round(value) ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Feedback interno del alumno — nunca se muestra a otros alumnos, sólo al docente. */
export function CourseRatingsDialog({ open, onOpenChange, courseId, courseName }: CourseRatingsDialogProps) {
  const { data, isPending } = useCourseRatings(open ? courseId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={460}>
        <DialogTitle>Calificaciones</DialogTitle>
        {courseName && <DialogDescription>{courseName}</DialogDescription>}

        {isPending && (
          <div className="mt-4 flex flex-col gap-2">
            <Skeleton className="h-14 rounded-2xl" />
            <Skeleton className="h-14 rounded-2xl" />
          </div>
        )}

        {data && data.count === 0 && (
          <p className="mt-4 text-body-sm font-semibold text-fg-faint">
            Todavía ningún alumno calificó este curso.
          </p>
        )}

        {data && data.count > 0 && (
          <>
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-muted p-3.5">
              <p className="text-display-sm font-extrabold text-fg">{data.average?.toFixed(1)}</p>
              <div>
                <Stars value={data.average ?? 0} />
                <p className="mt-0.5 text-tiny font-bold text-fg-ghost">
                  {data.count} calificación{data.count === 1 ? '' : 'es'}
                </p>
              </div>
            </div>

            <ul className={cn('mt-3 flex max-h-[280px] flex-col gap-2 overflow-y-auto')}>
              {data.reviews.map((review, index) => (
                <li key={index} className="rounded-2xl border border-line p-3">
                  <div className="flex items-center justify-between">
                    <Stars value={review.stars} />
                    <span className="text-tiny font-semibold text-fg-faint">{formatWhen(review.createdAt)}</span>
                  </div>
                  {review.review && (
                    <p className="mt-1.5 text-body-sm font-medium text-fg-body">{review.review}</p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
