import type { Metadata } from 'next';

import { CourseView } from '@/features/learning/components/course-view';
import { getCurrentProfile } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Mis cursos',
};

export default async function CoursePage() {
  const profile = await getCurrentProfile();
  return <CourseView currentUserId={profile?.id ?? null} />;
}
