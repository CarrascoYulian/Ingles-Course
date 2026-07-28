'use client';

import { Toaster as SonnerToaster } from 'sonner';

/**
 * Avisos del sistema. Réplica del toast del diseño: píldora #0F172A abajo
 * al centro, punto ámbar y sombra larga.
 *
 * Se usa Sonner en lugar de una implementación propia porque ya resuelve
 * bien los casos límite invisibles: pausa el temporizador cuando la pestaña
 * pierde el foco, apila con transiciones interrumpibles (no keyframes, que
 * reinician desde cero al encadenar avisos) y captura el puntero al arrastrar
 * para descartar.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      offset={34}
      duration={2600}
      gap={10}
      visibleToasts={3}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: [
            'flex items-center gap-2.5 w-fit mx-auto',
            'rounded-4xl bg-fg px-[18px] py-3',
            'font-sans text-body font-semibold text-white',
            'shadow-toast',
          ].join(' '),
          title: 'text-body font-semibold',
          description: 'text-meta font-medium text-white/70',
          icon: 'size-[7px] rounded-full bg-warning shrink-0',
          actionButton: 'ml-2 rounded-lg bg-white/15 px-2.5 py-1 text-tiny font-bold text-white',
        },
      }}
      icons={{
        success: <span className="size-[7px] shrink-0 rounded-full bg-success" />,
        error: <span className="size-[7px] shrink-0 rounded-full bg-danger" />,
        info: <span className="size-[7px] shrink-0 rounded-full bg-warning" />,
        warning: <span className="size-[7px] shrink-0 rounded-full bg-warning" />,
      }}
    />
  );
}
