import { redirect } from 'next/navigation';

import { MobileTabBar } from '@/components/shared/mobile-tab-bar';
import { StudentNavbar } from '@/components/student/student-navbar';
import { ROUTES } from '@/constants/routes';
import { getCurrentProfile } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { DEMO_STUDENT } from '@/services/demo/data';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect(ROUTES.login);

  // El personal docente también puede recorrer el curso como vista previa;
  // en ese caso se muestra la ficha del alumno de referencia.
  const learner = profile.role === 'student' ? profile : DEMO_STUDENT;

  // Antes esto era un `12` fijo en el código — TODOS los alumnos veían
  // "Racha 12 días" sin importar si jugaron modo práctica alguna vez. La
  // racha real (tipo Duolingo: sube sólo si cumplió la meta diaria de XP,
  // ver `recordDailyXpAndStreak` en `api/practice/answer`) ya se calculaba
  // y guardaba en `practice_progress.streak_days` — sólo nunca se leía acá.
  let streakDays = 0;
  if (profile.role === 'student') {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from('practice_progress')
        .select('streak_days')
        .eq('student_id', profile.id)
        .maybeSingle();
      streakDays = data?.streak_days ?? 0;
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-surface-muted print:bg-white">
      {/* La barra de navegación y la tab bar no tienen sentido en un PDF
          impreso (p. ej. el certificado de finalización) — `print:hidden`
          evita tener que duplicar el layout sólo para esa página. */}
      <div className="print:hidden">
        <StudentNavbar
          name={learner.fullName}
          enrollmentCode={learner.enrollmentCode ?? '—'}
          avatarColor={learner.avatarColor ?? '#2F6BFF'}
          streakDays={streakDays}
        />
      </div>

      <main id="contenido-principal" className="flex-1">
        {children}
      </main>

      <div className="print:hidden">
        <MobileTabBar variant="student" />
      </div>
    </div>
  );
}
