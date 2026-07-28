import type { Metadata } from 'next';

import { AchievementsView } from '@/features/learning/components/achievements-view';

export const metadata: Metadata = { title: 'Tus logros' };

export default function AchievementsPage() {
  return <AchievementsView />;
}
