import { cn } from '@/lib/utils';

/**
 * Placeholder de carga. Pulso lento y de bajo contraste: un esqueleto que
 * parpadea llama más la atención que el contenido que sustituye.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-2xl bg-line-soft', className)}
      {...props}
    />
  );
}

/** Anuncia la carga a lectores de pantalla sin ruido visual. */
export function LoadingRegion({ label = 'Cargando' }: { label?: string }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {label}
    </span>
  );
}
