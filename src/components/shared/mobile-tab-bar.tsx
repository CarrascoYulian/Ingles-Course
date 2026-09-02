'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ADMIN_NAV, STUDENT_NAV } from '@/constants/navigation';
import { useUnreadMessageCount } from '@/features/learning/hooks/use-learning';
import { useUnreadStaffMessageCount } from '@/features/students/hooks/use-students';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

/**
 * Barra inferior de móvil con estética Glass Dock.
 */
export function MobileTabBar({ variant }: { variant: 'admin' | 'student' }) {
  const pathname = usePathname();
  const items = variant === 'admin' ? ADMIN_NAV : STUDENT_NAV;

  const { data: unreadMessages = 0 } = useUnreadMessageCount(variant === 'student');
  const { data: unreadStaffMessages = 0 } = useUnreadStaffMessageCount(variant === 'admin');
  const badgeHref = variant === 'admin' ? ROUTES.admin.estudiantes : ROUTES.student.mensajes;
  const badgeCount = variant === 'admin' ? unreadStaffMessages : unreadMessages;

  return (
    <nav
      aria-label="Navegación principal"
      className="sticky bottom-0 z-30 flex border-t border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-lg px-3 pb-[max(18px,env(safe-area-inset-bottom))] pt-2 lg:hidden shadow-lg"
    >
      {items.map(({ href, shortLabel, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => {
              if (href === ROUTES.student.curso) {
                window.dispatchEvent(new CustomEvent('nav-student-courses'));
              }
            }}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1',
              'transition-all duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
              '[@media(hover:hover)_and_(pointer:fine)]:active:scale-[0.96]',
              active
                ? 'text-brand dark:text-blue-400 font-extrabold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 font-bold',
            )}
          >
            <span className="relative">
              <Icon
                aria-hidden
                size={20}
                strokeWidth={active ? 2.4 : 1.8}
                className={cn(active && 'text-brand drop-shadow-sm')}
              />
              {href === badgeHref && badgeCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-1 -top-0.5 size-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse"
                />
              )}
            </span>
            <span className="text-micro font-bold truncate max-w-full">{shortLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}

