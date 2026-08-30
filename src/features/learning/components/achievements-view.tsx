'use client';

import Link from 'next/link';

import { PageHeader } from '@/components/shared/page-header';
import { BadgeCard } from '@/components/student/badge-card';
import { Button } from '@/components/ui/button';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import { formatInteger } from '@/lib/format';
import { useBadges } from '../hooks/use-learning';
import { usePracticeSession } from '@/features/practice/hooks/use-practice';

export function AchievementsView() {
  const { data: badges, isPending } = useBadges();
  const { data: session } = usePracticeSession();
  const earned = badges?.filter((badge) => badge.earned).length ?? 0;
  const totalXp = session?.xp ?? 0;

  return (
    <div className="flex flex-col gap-3 px-5 py-5 lg:gap-4 lg:px-[30px] lg:py-[26px]">
      <PageHeader
        title="Tus logros"
        description={
          badges
            ? `${earned} de ${badges.length} insignias obtenidas · ${formatInteger(totalXp)} XP acumulados`
            : 'Cargando insignias…'
        }
        actions={
          <Button asChild size="md" className="hidden font-extrabold sm:inline-flex">
            <Link href={ROUTES.practice.root}>Practicar para la próxima</Link>
          </Button>
        }
      />

      {isPending && (
        <>
          <LoadingRegion label="Cargando insignias" />
          <div className="grid grid-cols-2 gap-3 lg:max-w-[900px] lg:grid-cols-3 lg:gap-3.5">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-[136px] rounded-6xl" />
            ))}
          </div>
        </>
      )}

      {badges && (
        <ul className="grid grid-cols-2 gap-3 lg:max-w-[900px] lg:grid-cols-3 lg:gap-3.5">
          {badges.map((badge) => (
            <li key={badge.id}>
              <BadgeCard badge={badge} />
            </li>
          ))}
        </ul>
      )}

      <Button asChild size="block" className="sm:hidden">
        <Link href={ROUTES.practice.root}>Practicar para la próxima</Link>
      </Button>
    </div>
  );
}
