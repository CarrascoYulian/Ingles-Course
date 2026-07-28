'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

/**
 * Límite de error de la aplicación. Muestra un mensaje accionable en lugar
 * del stack: el detalle técnico va a la consola y al servicio de telemetría.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app] error no controlado', error);
  }, [error]);

  return (
    <main
      id="contenido-principal"
      className="grid min-h-dvh place-items-center bg-canvas px-5 text-center"
    >
      <div className="max-w-[440px]">
        <p className="text-tiny font-extrabold tracking-eyebrow text-danger">ALGO SALIÓ MAL</p>
        <h1 className="mt-2 text-heading-lg font-extrabold tracking-heading text-fg">
          No pudimos cargar esta sección
        </h1>
        <p className="mt-2 text-body-sm font-medium text-fg-dim">
          Tu progreso está guardado. Vuelve a intentarlo; si sigue fallando, avísanos con el
          código {error.digest ?? 'sin identificar'}.
        </p>
        <Button size="md" onClick={reset} className="mt-6">
          Reintentar
        </Button>
      </div>
    </main>
  );
}
