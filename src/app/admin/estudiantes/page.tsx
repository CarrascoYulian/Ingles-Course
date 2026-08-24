import type { Metadata } from 'next';

import { StudentsView } from '@/features/students/components/students-view';

export const metadata: Metadata = { title: 'Estudiantes' };

// Sin `<Suspense>` propio a propósito, igual que `/admin/cursos`
// (`CoursesView` también usa `useAdminSearch` → `useSearchParams` sin
// envoltura local): el límite de `AdminTopbar` en `AdminShell` ya cubre el
// requisito de Next para `useSearchParams`. Envolver esto en un segundo
// `<Suspense>` anidado (como estaba antes) dejaba el árbol de esta página
// colgado en el placeholder de streaming — nunca terminaba de hidratar y
// `StudentsView` se quedaba en "Cargando estudiantes" para siempre.
export default function StudentsPage() {
  return <StudentsView />;
}
