import { redirect } from 'next/navigation';

import { MobileTabBar } from '@/components/shared/mobile-tab-bar';
import { StudentNavbar } from '@/components/student/student-navbar';
import { ROUTES } from '@/constants/routes';
import { getCurrentProfile } from '@/lib/auth/session';
import { DEMO_STUDENT } from '@/services/demo/data';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect(ROUTES.login);

  // El personal docente también puede recorrer el curso como vista previa;
  // en ese caso se muestra la ficha del alumno de referencia.
  const learner = profile.role === 'student' ? profile : DEMO_STUDENT;

  return (
    <div className="flex min-h-dvh flex-col bg-surface-muted">
      <StudentNavbar
        name={learner.fullName}
        enrollmentCode={learner.enrollmentCode ?? '—'}
        avatarColor={learner.avatarColor ?? '#2F6BFF'}
        streakDays={12}
      />

      <main id="contenido-principal" className="flex-1">
        {children}
      </main>

      <MobileTabBar variant="student" />
    </div>
  );
}
