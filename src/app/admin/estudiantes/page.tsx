import type { Metadata } from 'next';
import { Suspense } from 'react';

import { StudentsView } from '@/features/students/components/students-view';

export const metadata: Metadata = { title: 'Estudiantes' };

export default function StudentsPage() {
  // `useSearchParams` exige un límite de Suspense para no forzar el renderizado
  // dinámico de toda la ruta.
  return (
    <Suspense fallback={null}>
      <StudentsView />
    </Suspense>
  );
}
