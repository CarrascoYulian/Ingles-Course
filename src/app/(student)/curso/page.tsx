import type { Metadata } from 'next';

import { CourseView } from '@/features/learning/components/course-view';

export const metadata: Metadata = {
  title: 'Present Perfect vs. Past Simple',
  description: 'Módulo 4 · Tiempos perfectos · Inglés conversacional B1',
};

export default function CoursePage() {
  return <CourseView />;
}
