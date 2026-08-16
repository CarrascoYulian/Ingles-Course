import type { Metadata } from 'next';

import { CourseForumView } from '@/features/learning/components/course-forum-view';

export const metadata: Metadata = {
  title: 'Foro del curso',
};

export default async function CourseForumPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <CourseForumView courseId={courseId} />;
}
