import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LogoMark } from '@/components/shared/logo';
import { Card } from '@/components/ui/card';
import { APP_NAME } from '@/constants';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata: Metadata = { title: 'Entrar' };

/**
 * Pantalla no incluida en el mockup: se completa con el mismo lenguaje
 * visual (fondo #EEF0F4, tarjeta blanca radio 22, marca teal, tipografía
 * Plus Jakarta Sans).
 */
export default function LoginPage() {
  return (
    <main
      id="contenido-principal"
      className="grid min-h-dvh place-items-center bg-canvas px-5 py-10"
    >
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <LogoMark size={32} className="size-11 rounded-2xl text-title" />
          <div>
            <h1 className="text-heading font-extrabold tracking-heading text-fg">{APP_NAME}</h1>
            <p className="mt-1 text-body-sm font-medium text-fg-dim">
              Entra con la cuenta de tu matrícula para continuar tu curso.
            </p>
          </div>
        </div>

        <Card radius="2xl" padding="none" className="mt-6 p-6 shadow-card">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </Card>

        <p className="mt-5 text-center text-meta font-semibold text-fg-faint">
          ¿Problemas para entrar? Escribe a{' '}
          <a href="mailto:soporte@ingles-con-metodo.do" className="font-bold text-brand underline">
            soporte@ingles-con-metodo.do
          </a>
        </p>
      </div>
    </main>
  );
}
