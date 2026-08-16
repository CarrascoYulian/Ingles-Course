import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AdminShell } from '@/components/admin/admin-shell';
import { ROUTES } from '@/constants/routes';
import { isStaff } from '@/lib/auth/rbac';
import { getCurrentProfile } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: { default: 'Panel docente', template: '%s · Panel docente' },
};

/**
 * El middleware ya bloquea el acceso en el edge; esta segunda comprobación
 * en servidor es la que realmente protege los datos si alguien alcanza la
 * ruta por otra vía (RSC directo, error de configuración del matcher).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect(ROUTES.login);
  if (!isStaff(profile.role)) redirect(ROUTES.student.curso);

  return (
    <AdminShell teacherName={profile.fullName} role={profile.role}>
      {children}
    </AdminShell>
  );
}
