import type { Metadata } from 'next';

import { CourseView } from '@/features/learning/components/course-view';

export const metadata: Metadata = {
  title: 'Mi curso',
};

export default function CoursePage() {
  return <CourseView />;
}
