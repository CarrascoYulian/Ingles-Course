'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { LogoutButton } from '@/components/shared/logout-button';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ADMIN_PAGE_META } from '@/constants/navigation';
import { ROUTES } from '@/constants/routes';
import { useAdminSearch } from '@/features/students/hooks/use-admin-search';
import { NotificationBell } from './notification-bell';

/** Páginas donde el buscador global filtra algo — en el resto se oculta. */
const SEARCHABLE_PATHS: readonly string[] = [ROUTES.admin.estudiantes, ROUTES.admin.cursos];

export interface AdminTopbarProps {
  subtitle: string;
  teacherName: string;
  /** Acción primaria de la sección (varía por ruta). */
  action: ReactNode;
}

/**
 * Cabecera del panel. En móvil se reordena: el título pasa arriba con el
 * avatar y el buscador ocupa toda la línea siguiente, como en el diseño.
 */
export function AdminTopbar({ subtitle, teacherName, action }: AdminTopbarProps) {
  const pathname = usePathname();
  const { query, setQuery } = useAdminSearch();
  const meta = ADMIN_PAGE_META[pathname];
  const searchable = SEARCHABLE_PATHS.includes(pathname);
  const placeholder = pathname === ROUTES.admin.cursos ? 'Buscar curso…' : 'Buscar estudiante…';
  const ariaLabel = pathname === ROUTES.admin.cursos ? 'Buscar curso' : 'Buscar estudiante';

  return (
    <header className="border-b border-line bg-surface px-5 py-3 lg:px-[30px] lg:py-[22px]">
      <div className="flex items-center justify-between gap-5">
        <div className="min-w-0">
          <p className="text-meta font-bold text-fg-ghost lg:hidden">Panel docente</p>
          <h1 className="truncate text-[20px] font-extrabold tracking-heading text-fg lg:text-heading">
            {meta?.title ?? 'Panel docente'}
          </h1>
          <p className="mt-0.5 hidden text-body-sm font-medium text-fg-dim lg:block">{subtitle}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {searchable && (
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              aria-label={ariaLabel}
              icon={<Search size={15} strokeWidth={2} />}
              className="hidden w-[230px] lg:flex"
            />
          )}
          <NotificationBell />
          <ThemeToggle />
          <div className="hidden lg:block">{action}</div>
          <Link href={ROUTES.admin.cuenta} aria-label="Mi cuenta" className="lg:hidden">
            <Avatar name={teacherName} color="#0F5257" size={34} />
          </Link>
          <LogoutButton iconOnly className="lg:hidden" />
        </div>
      </div>

      {searchable && (
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          icon={<Search size={15} strokeWidth={2} />}
          className="mt-3.5 lg:hidden"
        />
      )}
    </header>
  );
}
