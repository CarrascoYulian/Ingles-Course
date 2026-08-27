import type { Metadata } from 'next';

import { Card } from '@/components/ui/card';
import { AcceptInvitationForm } from '@/features/auth/components/accept-invitation-form';

export const metadata: Metadata = { title: 'Aceptar invitación' };

/**
 * Pública (no está en `PROTECTED_PREFIXES`): quien llega acá todavía no
 * tiene sesión — la obtiene recién cuando Supabase valida el token de la
 * invitación y redirige con `#access_token=...` en el propio link del
 * correo, que sólo el navegador puede leer (nunca llega al servidor).
 */
export default function AcceptInvitationPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-5 py-10">
      <div className="w-full max-w-[420px]">
        <Card radius="2xl" padding="lg" className="shadow-card">
          <h1 className="text-center text-heading font-extrabold tracking-heading text-fg">
            Bienvenido al equipo
          </h1>
          <div className="mt-5">
            <AcceptInvitationForm />
          </div>
        </Card>
      </div>
    </main>
  );
}
