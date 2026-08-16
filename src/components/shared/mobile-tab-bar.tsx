'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ADMIN_NAV, STUDENT_NAV } from '@/constants/navigation';
import { useUnreadMessageCount } from '@/features/learning/hooks/use-learning';
import { useUnreadStaffMessageCount } from '@/features/students/hooks/use-students';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

/**
 * Barra inferior de móvil. En el mockup era una pantalla aparte; aquí es la
 * misma navegación en un punto de ruptura distinto, así que la información
 * y el orden se conservan y sólo cambia la disposición.
 *
 * Recibe `variant` (un string) y resuelve el array de navegación aquí
 * dentro, en vez de recibir los `NavItem[]` como prop: cada `NavItem` lleva
 * un componente de icono de lucide-react, y una función no puede cruzar la
 * frontera servidor→cliente como prop serializada — el layout del alumno es
 * un Server Component y pasarle `STUDENT_NAV` directamente rompe el build.
 *
 * `pb-safe` respeta el indicador de inicio en iPhone; los destinos táctiles
 * superan los 44 px de alto que exige WCAG 2.5.5.
 */
export function MobileTabBar({ variant }: { variant: 'admin' | 'student' }) {
  const pathname = usePathname();
  const items = variant === 'admin' ? ADMIN_NAV : STUDENT_NAV;

  // Cada hook se llama siempre (las reglas de hooks no permiten condicionarlo
  // al variant) pero sólo uno queda `enabled` según el rol — el otro no
  // dispara ninguna petición.
  const { data: unreadMessages = 0 } = useUnreadMessageCount(variant === 'student');
  const { data: unreadStaffMessages = 0 } = useUnreadStaffMessageCount(variant === 'admin');
  const badgeHref = variant === 'admin' ? ROUTES.admin.estudiantes : ROUTES.student.mensajes;
  const badgeCount = variant === 'admin' ? unreadStaffMessages : unreadMessages;

  return (
    <nav
      aria-label="Navegación principal"
      className="sticky bottom-0 z-30 flex border-t border-line bg-surface px-3.5 pb-[max(22px,env(safe-area-inset-bottom))] pt-2 lg:hidden"
    >
      {items.map(({ href, shortLabel, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1.5',
              'transition-colors duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
              '[@media(hover:hover)_and_(pointer:fine)]:active:scale-[0.97]',
              active ? 'text-brand' : 'text-fg-disabled',
            )}
          >
            <span className="relative">
              <Icon aria-hidden size={19} strokeWidth={1.9} />
              {href === badgeHref && badgeCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-1.5 -top-1 size-[9px] rounded-full bg-danger ring-2 ring-surface"
                />
              )}
            </span>
            <span className="text-micro font-extrabold">{shortLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
