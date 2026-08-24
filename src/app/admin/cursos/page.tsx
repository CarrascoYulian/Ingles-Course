import type { Metadata } from 'next';

import { CoursesView } from '@/features/courses/components/courses-view';

export const metadata: Metadata = { title: 'Cursos y unidades' };

export default function CoursesPage() {
  return <CoursesView />;
}
