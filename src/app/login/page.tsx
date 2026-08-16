import type { Metadata } from 'next';
import Image from 'next/image';
import { Suspense } from 'react';

import { Card } from '@/components/ui/card';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata: Metadata = { title: 'Entrar' };

/**
 * Diseño split-screen: panel izquierdo con el formulario sobre fondo claro,
 * panel derecho con el póster de marca "Online English Program" (assets en
 * public/login/, provistos por el cliente).
 */
export default function LoginPage() {
  return (
    <main id="contenido-principal" className="relative grid min-h-dvh bg-canvas lg:grid-cols-[60%_40%]">
      {/* Waves decorativos (estilo getwaves.io), a lo ancho de TODA la
          página (no sólo el panel del formulario) — antes vivían dentro del
          panel izquierdo con `overflow-hidden`, así que `w-full` medía el
          60 % de la pantalla y la curva se cortaba en seco justo donde
          empezaba el póster, en vez de llegar al borde real. Van como
          hermanos de los dos paneles (ambos ya `relative`) para pintarse
          detrás de los dos sin taparlos. */}
      <svg
        aria-hidden
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 top-0 h-36 w-full text-brand/10"
      >
        <path
          fill="currentColor"
          d="M0,96L48,112C96,128,192,160,288,154.7C384,149,480,107,576,101.3C672,96,768,128,864,149.3C960,171,1056,181,1152,165.3C1248,149,1344,107,1392,85.3L1440,64L1440,0L0,0Z"
        />
      </svg>
      <svg
        aria-hidden
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 w-full text-brand/5"
      >
        <path
          fill="currentColor"
          d="M0,192L60,181.3C120,171,240,149,360,154.7C480,160,600,192,720,208C840,224,960,224,1080,202.7C1200,181,1320,139,1380,117.3L1440,96L1440,320L0,320Z"
        />
      </svg>
      <svg
        aria-hidden
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-36 w-full text-brand/10"
      >
        <path
          fill="currentColor"
          d="M0,256L60,240C120,224,240,192,360,192C480,192,600,224,720,229.3C840,235,960,213,1080,192C1200,171,1320,149,1380,138.7L1440,128L1440,320L0,320Z"
        />
      </svg>
      <svg
        aria-hidden
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full text-brand/20"
      >
        <path
          fill="currentColor"
          d="M0,288L80,282.7C160,277,320,267,480,272C640,277,800,299,960,293.3C1120,288,1280,256,1360,240L1440,224L1440,320L0,320Z"
        />
      </svg>

      <div className="relative flex items-center justify-center px-5 py-10">
        <div className="relative z-10 w-full max-w-[420px]">
          <Card radius="2xl" padding="none" className="relative overflow-visible p-6 pt-24 shadow-card">
            {/* Hueco: círculo del color de fondo de la página, más grande que el logo. */}
            <div
              aria-hidden
              className="absolute left-1/2 top-0 size-[140px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-canvas"
            />
            {/* Logo: la "pieza" que encaja en el hueco, ligeramente más chica y por encima. */}
            <div className="absolute left-1/2 top-0 z-10 size-28 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full">
              <Image
                src="/login/logo.jpeg"
                alt="Bertho Community"
                fill
                className="object-cover"
                priority
              />
            </div>

            <div className="flex flex-col items-center gap-3 text-center">
              <div>
                <h1 className="text-heading font-extrabold tracking-heading text-fg">
                  Bertho Community
                </h1>
                <p className="mt-1 text-body-sm font-medium text-fg-dim">
                  Entra con la cuenta de tu matrícula para continuar tu curso.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Suspense fallback={null}>
                <LoginForm />
              </Suspense>
            </div>
          </Card>

          <p className="mt-5 text-center text-meta font-semibold text-fg-faint">
            ¿Problemas para entrar? Escribe a{' '}
            <a
              href="mailto:soporte@ingles-con-metodo.do"
              className="font-bold text-brand underline"
            >
              soporte@ingles-con-metodo.do
            </a>
          </p>
        </div>
      </div>

      <div className="relative hidden lg:block">
        <Image
          src="/login/poster.png"
          alt="Online English Program — Bertho Community"
          fill
          sizes="40vw"
          className="object-contain object-right"
          priority
        />
      </div>
    </main>
  );
}
