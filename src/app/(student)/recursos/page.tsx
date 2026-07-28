import type { Metadata } from 'next';

import { ResourcesView } from '@/features/learning/components/resources-view';

export const metadata: Metadata = { title: 'Recursos del curso' };

export default function ResourcesPage() {
  return <ResourcesView />;
}
