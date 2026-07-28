import type { Metadata } from 'next';

import { DashboardView } from '@/features/analytics/components/dashboard-view';

export const metadata: Metadata = { title: 'Resumen general' };

export default function DashboardPage() {
  return <DashboardView />;
}
