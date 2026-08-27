import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AccountView } from '@/features/account/components/account-view';
import { ROUTES } from '@/constants/routes';
import { isStaff } from '@/lib/auth/rbac';
import { getCurrentProfile } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Mi cuenta' };

export default async function AccountPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect(ROUTES.login);
  if (!isStaff(profile.role)) redirect(ROUTES.student.curso);

  return <AccountView fullName={profile.fullName} role={profile.role} />;
}
