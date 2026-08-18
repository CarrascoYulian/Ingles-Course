import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ROUTES } from '@/constants/routes';
import { getCurrentProfile } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: { default: 'BerthoGo', template: '%s · BerthoGo' },
};

/**
 * La práctica es pantalla completa a propósito: sin barra lateral ni de
 * pestañas. Cada elemento fuera del ejercicio es una salida, y aquí el
 * objetivo es terminar la sesión.
 */
export default async function PracticeLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect(ROUTES.login);

  return <main id="contenido-principal">{children}</main>;
}
