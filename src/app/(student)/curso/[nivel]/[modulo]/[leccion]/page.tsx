import type { Metadata } from 'next';

import { CourseView } from '@/features/learning/components/course-view';
import { getCurrentProfile } from '@/lib/auth/session';

interface PageProps {
  params: Promise<{ nivel: string; modulo: string; leccion: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { leccion } = await params;
  const order = leccion.replace('leccion-', '');
  return { title: `Lección ${order}` };
}

/**
 * URL profunda de lección — `/curso/b1/modulo-4/leccion-5`, igual que en el
 * diseño. Antes esta página ignoraba sus propios parámetros y siempre
 * renderizaba "la lección actual" calculada por dentro: un enlace
 * compartido a la lección 2 abría la 5. Ahora el número de lección de la
 * URL se pasa de verdad a `CourseView`.
 */
export default async function LessonPage({ params }: PageProps) {
  const { nivel, modulo, leccion } = await params;
  const order = Number(leccion.replace('leccion-', ''));
  const profile = await getCurrentProfile();
  return (
    <CourseView
      level={nivel}
      moduleSlugOrId={modulo}
      lessonOrder={Number.isFinite(order) ? order : undefined}
      currentUserId={profile?.id ?? null}
    />
  );
}
