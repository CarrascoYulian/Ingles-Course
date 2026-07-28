import type { Metadata } from 'next';

import { PracticeView } from '@/features/practice/components/practice-view';

interface PageProps {
  params: Promise<{ nivel: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { nivel } = await params;
  return { title: `Nivel ${nivel.replace('nivel-', '')}` };
}

export default function PracticeLevelPage() {
  return <PracticeView />;
}
