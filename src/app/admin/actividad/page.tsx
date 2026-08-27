import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AuditLogView } from '@/features/audit/components/audit-log-view';
import { ROUTES } from '@/constants/routes';
import { getCurrentProfile } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Actividad' };

/** Sólo admin — igual que `PERMISSIONS['audit:read']` en `src/lib/auth/rbac.ts`. */
export default async function AuditPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect(ROUTES.login);
  if (profile.role !== 'admin') redirect(ROUTES.admin.dashboard);

  return <AuditLogView />;
}
