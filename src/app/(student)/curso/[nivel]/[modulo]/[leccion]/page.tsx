import type { Metadata } from 'next';

import { CourseView } from '@/features/learning/components/course-view';

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
 * diseño. La lección activa se resuelve desde la ruta y no desde estado
 * interno: el enlace es compartible y el botón atrás funciona.
 */
export default function LessonPage() {
  return <CourseView />;
}
