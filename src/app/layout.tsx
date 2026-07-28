import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';

import { Toaster } from '@/components/ui/toaster';
import { APP_NAME, APP_TAGLINE } from '@/constants';
import { clientEnv } from '@/lib/env';
import { Providers } from './providers';

import './globals.css';

/**
 * `next/font` descarga y autoaloja la fuente en build: sin petición a
 * Google en tiempo de ejecución, sin FOUT y sin capa de privacidad extra.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  metadataBase: new URL(clientEnv.NEXT_PUBLIC_SITE_URL),
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_TAGLINE,
  applicationName: APP_NAME,
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    locale: 'es_DO',
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_TAGLINE,
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0F5257',
  width: 'device-width',
  initialScale: 1,
  // Se permite ampliar: bloquear el zoom incumple WCAG 1.4.4.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={jakarta.variable}>
      <body className="min-h-dvh bg-canvas font-sans antialiased">
        <a
          href="#contenido-principal"
          className="sr-only-focusable absolute left-4 top-4 z-100 rounded-lg bg-brand px-4 py-2 text-body-sm font-bold text-white"
        >
          Saltar al contenido
        </a>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
