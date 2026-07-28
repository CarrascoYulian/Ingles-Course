'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Logo } from '@/components/shared/logo';
import { LogoutButton } from '@/components/shared/logout-button';
import { Avatar } from '@/components/ui/avatar';
import { STUDENT_NAV } from '@/constants/navigation';
import { cn } from '@/lib/utils';

export interface StudentNavbarProps {
  name: string;
  enrollmentCode: string;
  avatarColor: string;
  streakDays: number;
}

/**
 * Cabecera del alumno. En móvil se reduce a marca + racha + avatar: la
 * navegación vive en la barra inferior, al alcance del pulgar.
 */
export function StudentNavbar({ name, enrollmentCode, avatarColor, streakDays }: StudentNavbarProps) {
  const pathname = usePathname();
  const firstName = name.split(' ').slice(0, 2).join(' ');

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-6 border-b border-line bg-surface px-5 py-3.5 lg:px-[30px] lg:py-4">
      <div className="flex min-w-0 items-center gap-7">
        <Logo />
        <nav aria-label="Secciones del curso" className="hidden gap-[22px] lg:flex">
          {STUDENT_NAV.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'border-b-2 pb-0.5 text-body-sm font-bold transition-colors duration-[160ms]',
                  active
                    ? 'border-brand text-fg'
                    : 'border-transparent text-fg-faint hover:text-fg-subtle',
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-3.5">
        <p className="flex items-center gap-[7px] rounded-lg bg-warning-soft px-3 py-[7px]">
          <span aria-hidden className="size-[7px] rounded-full bg-warning" />
          <span className="text-label font-extrabold text-warning-strong">
            <span className="hidden sm:inline">Racha </span>
            {streakDays} <span className="hidden sm:inline">días</span>
          </span>
        </p>
        <div className="flex items-center gap-[9px]">
          <Avatar name={name} color={avatarColor} size={32} />
          <span className="hidden flex-col leading-[1.2] sm:flex">
            <span className="text-label font-bold text-fg">{firstName}</span>
            <span className="text-caption font-semibold text-fg-ghost">{enrollmentCode}</span>
          </span>
        </div>
        <LogoutButton className="hidden lg:flex" />
        <LogoutButton iconOnly className="lg:hidden" />
      </div>
    </header>
  );
}
