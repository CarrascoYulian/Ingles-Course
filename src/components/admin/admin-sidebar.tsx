'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LogoMark } from '@/components/shared/logo';
import { LogoutButton } from '@/components/shared/logout-button';
import { ADMIN_NAV } from '@/constants/navigation';
import { cn } from '@/lib/utils';

export interface AdminSidebarProps {
  teacherName: string;
}

/**
 * Barra lateral del panel docente (sólo ≥ lg). En móvil su lugar lo ocupa
 * `MobileTabBar`, con los mismos destinos.
 */
export function AdminSidebar({ teacherName }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-sidebar shrink-0 flex-col gap-[26px] bg-ink px-4 py-6 lg:flex">
      <div className="flex items-center gap-2.5 px-2">
        <LogoMark size={32} />
        <span className="flex min-w-0 flex-col leading-[1.2]">
          <span className="truncate text-body font-bold text-white">Panel docente</span>
          <span className="truncate text-caption font-medium text-ink-fg-dim">
            Prof. {teacherName}
          </span>
        </span>
      </div>

      <nav aria-label="Gestión" className="flex flex-col gap-[3px]">
        <p className="px-2 pb-2 text-micro font-bold tracking-eyebrow text-ink-nav-label">
          GESTIÓN
        </p>
        {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-[11px] rounded-xl px-3 py-2.5',
                'text-body-sm font-semibold',
                'transition-[background-color,color,transform] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
                '[@media(hover:hover)_and_(pointer:fine)]:active:scale-[0.98]',
                active
                  ? 'bg-ink-elevated text-white'
                  : 'text-ink-nav hover:bg-ink-raised hover:text-white',
              )}
            >
              <Icon aria-hidden size={17} strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      <LogoutButton onInk className="mt-auto justify-center" />
    </aside>
  );
}
