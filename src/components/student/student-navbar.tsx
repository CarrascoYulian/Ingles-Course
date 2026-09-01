'use client';

import { Flame } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Logo } from '@/components/shared/logo';
import { LogoutButton } from '@/components/shared/logout-button';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { StudentNotificationBell } from '@/components/student/notification-bell';
import { Avatar } from '@/components/ui/avatar';
import { STUDENT_NAV } from '@/constants/navigation';
import { ROUTES } from '@/constants/routes';
import { useUnreadMessageCount } from '@/features/learning/hooks/use-learning';
import { cn } from '@/lib/utils';

export interface StudentNavbarProps {
  name: string;
  enrollmentCode: string;
  avatarColor: string;
  streakDays: number;
}

/**
 * Cabecera del alumno con efecto glassmorphic y diseño tecnológico.
 */
export function StudentNavbar({ name, enrollmentCode, avatarColor, streakDays }: StudentNavbarProps) {
  const pathname = usePathname();
  const firstName = name.split(' ').slice(0, 2).join(' ');
  const { data: unreadMessages = 0 } = useUnreadMessageCount();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-6 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md px-5 py-3 lg:px-8 lg:py-3.5 shadow-sm transition-colors">
      <div className="flex min-w-0 items-center gap-8">
        <Logo />
        <nav aria-label="Secciones del curso" className="hidden gap-1.5 lg:flex">
          {STUDENT_NAV.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative rounded-xl px-3.5 py-1.5 text-body-sm font-extrabold transition-all duration-150',
                  active
                    ? 'bg-blue-50 dark:bg-blue-950/70 text-brand dark:text-blue-400 shadow-sm border border-blue-200/50 dark:border-blue-800/50'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white',
                )}
              >
                {label}
                {href === ROUTES.student.mensajes && unreadMessages > 0 && (
                  <span
                    aria-hidden
                    className="absolute right-1 top-1 size-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse"
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {/* Racha con llama brillante animada */}
        <div
          title={`${streakDays} días consecutivos practicando`}
          className="flex items-center gap-1.5 rounded-full border border-amber-300/80 dark:border-amber-700/60 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 px-3 py-1 text-amber-900 dark:text-amber-200 shadow-sm"
        >
          <Flame aria-hidden className="size-4 fill-amber-500 text-amber-500 animate-pulse" />
          <span className="text-caption font-extrabold tabular-nums">
            <span className="hidden sm:inline">Racha </span>
            {streakDays} <span className="hidden sm:inline">días</span>
          </span>
        </div>

        <StudentNotificationBell />

        <ThemeToggle />

        <div className="flex items-center gap-2.5 rounded-xl p-1 hover:bg-slate-100/60 dark:hover:bg-slate-800 transition-colors">
          <Avatar name={name} color={avatarColor} size={34} className="ring-2 ring-white dark:ring-slate-800 shadow-sm" />
          <span className="hidden flex-col leading-tight sm:flex text-left">
            <span className="text-meta font-extrabold text-slate-900 dark:text-slate-100">{firstName}</span>
            <span className="text-micro font-bold text-slate-500 dark:text-slate-400 font-mono tracking-wider">{enrollmentCode}</span>
          </span>
        </div>

        <LogoutButton className="hidden lg:flex" />
        <LogoutButton iconOnly className="lg:hidden" />
      </div>
    </header>
  );
}

