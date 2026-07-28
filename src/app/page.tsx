import { redirect } from 'next/navigation';

import { LANDING_BY_ROLE, ROUTES } from '@/constants/routes';
import { getCurrentProfile } from '@/lib/auth/session';

/** Raíz: cada rol aterriza donde le corresponde. */
export default async function HomePage() {
  const profile = await getCurrentProfile();
  redirect(profile ? LANDING_BY_ROLE[profile.role] : ROUTES.login);
}
