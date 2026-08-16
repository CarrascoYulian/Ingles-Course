import type { Metadata } from 'next';

import { CourseThreadView } from '@/features/learning/components/course-thread-view';
import { getCurrentProfile } from '@/lib/auth/session';
import { isStaff } from '@/lib/auth/rbac';

export const metadata: Metadata = {
  title: 'Tema del foro',
};

export default async function CourseThreadPage({
  params,
}: {
  params: Promise<{ courseId: string; threadId: string }>;
}) {
  const { courseId, threadId } = await params;
  const profile = await getCurrentProfile();
  return (
    <CourseThreadView
      courseId={courseId}
      threadId={threadId}
      currentUserId={profile?.id ?? null}
      canModerate={isStaff(profile?.role)}
    />
  );
}
