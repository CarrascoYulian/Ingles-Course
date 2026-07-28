import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';

export default function NotFound() {
  return (
    <main
      id="contenido-principal"
      className="grid min-h-dvh place-items-center bg-canvas px-5 text-center"
    >
      <div className="max-w-[420px]">
        <p className="text-tiny font-extrabold tracking-eyebrow text-brand">ERROR 404</p>
        <h1 className="mt-2 text-heading-lg font-extrabold tracking-heading text-fg">
          Esta página no existe
        </h1>
        <p className="mt-2 text-body-sm font-medium text-fg-dim">
          Puede que el curso se haya despublicado o que el enlace esté incompleto.
        </p>
        <Button asChild size="md" className="mt-6">
          <Link href={ROUTES.home}>Volver al inicio</Link>
        </Button>
      </div>
    </main>
  );
}
