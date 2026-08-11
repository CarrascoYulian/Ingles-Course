import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContentView } from '@/features/content/components/content-view';

export const metadata: Metadata = { title: 'Constructor de contenido' };

export default function ContentPage() {
  return (
    <Suspense>
      <ContentView />
    </Suspense>
  );
}
