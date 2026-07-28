import type { Metadata } from 'next';

import { ReportsView } from '@/features/analytics/components/reports-view';

export const metadata: Metadata = { title: 'Reportes' };

export default function ReportsPage() {
  return <ReportsView />;
}
