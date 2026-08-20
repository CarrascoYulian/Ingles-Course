import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AssignmentsAdminView } from '@/features/assignments/components/assignments-admin-view';

export const metadata: Metadata = { title: 'Tareas' };

export default function AdminAssignmentsPage() {
  return (
    <Suspense>
      <AssignmentsAdminView />
    </Suspense>
  );
}
