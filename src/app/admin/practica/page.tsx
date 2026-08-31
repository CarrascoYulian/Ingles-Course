import type { Metadata } from 'next';

import { PracticeAdminView } from '@/features/practice-admin/components/practice-admin-view';

export const metadata: Metadata = { title: 'BerthoGo' };

export default function PracticeAdminPage() {
  return <PracticeAdminView />;
}
