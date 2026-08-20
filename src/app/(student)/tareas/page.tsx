import type { Metadata } from 'next';

import { AssignmentsStudentView } from '@/features/assignments/components/assignments-student-view';

export const metadata: Metadata = { title: 'Tareas' };

export default function StudentAssignmentsPage() {
  return <AssignmentsStudentView />;
}
