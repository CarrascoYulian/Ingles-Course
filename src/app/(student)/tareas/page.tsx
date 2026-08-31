import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AssignmentsStudentView } from '@/features/assignments/components/assignments-student-view';

export const metadata: Metadata = { title: 'Tareas' };

export default function StudentAssignmentsPage() {
  return (
    <Suspense>
      <AssignmentsStudentView />
    </Suspense>
  );
}
