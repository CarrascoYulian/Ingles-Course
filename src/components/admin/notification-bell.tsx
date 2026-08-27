'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';

import { useAdminRole } from '@/components/admin/admin-shell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROUTES } from '@/constants/routes';
import { useUngradedCount } from '@/features/assignments/hooks/use-assignments';
import { useUnreadStaffMessageCount } from '@/features/students/hooks/use-students';
import { cn } from '@/lib/utils';

/**
 * Agrega eventos que ya existían por separado (mensajes sin leer, entregas
 * sin calificar) — sin tabla de notificaciones nueva. Mismo polling de 20 s
 * que ya usa `useUnreadStaffMessageCount`, no un websocket.
 */
export function NotificationBell() {
  const role = useAdminRole();
  const { data: unreadMessages = 0 } = useUnreadStaffMessageCount();
  const { data: ungraded = 0 } = useUngradedCount();
  const total = unreadMessages + ungraded;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={total > 0 ? `${total} notificaciones` : 'Notificaciones'}
          className={cn(
            'relative grid size-9 shrink-0 place-items-center rounded-xl border border-line-strong bg-surface text-fg-subtle',
            'transition-colors duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-fg-placeholder',
          )}
        >
          <Bell aria-hidden size={16} strokeWidth={1.9} />
          {total > 0 && (
            <span className="absolute -right-1 -top-1 grid size-[17px] place-items-center rounded-full bg-danger text-micro font-extrabold text-white">
              {total > 9 ? '9+' : total}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[260px]">
        <NotificationRow
          href={ROUTES.admin.estudiantes}
          label="Mensajes sin leer"
          count={unreadMessages}
        />
        <NotificationRow label="Entregas sin calificar" count={ungraded} />
        {total === 0 && (
          <p className="px-2.5 py-2 text-meta font-medium text-fg-faint">Sin novedades</p>
        )}
        {role === 'admin' && (
          <>
            <DropdownMenuSeparator />
            <Link
              href={ROUTES.admin.actividad}
              className="block rounded-lg px-2.5 py-2 text-label font-semibold text-brand hover:bg-surface-muted"
            >
              Ver actividad
            </Link>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationRow({ href, label, count }: { href?: string; label: string; count: number }) {
  if (count === 0) return null;

  const content = (
    <div className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-label font-semibold text-fg">
      {label}
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-danger-soft text-tiny font-extrabold text-danger-strong">
        {count > 9 ? '9+' : count}
      </span>
    </div>
  );

  return href ? (
    <Link href={href} className="block hover:bg-surface-muted">
      {content}
    </Link>
  ) : (
    content
  );
}
