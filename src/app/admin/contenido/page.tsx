import type { Metadata } from 'next';

import { ContentView } from '@/features/content/components/content-view';

export const metadata: Metadata = { title: 'Constructor de contenido' };

export default function ContentPage() {
  return <ContentView />;
}
