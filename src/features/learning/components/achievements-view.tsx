'use client';

import { Sparkles, Trophy } from 'lucide-react';
import Link from 'next/link';

import { BadgeCard } from '@/components/student/badge-card';
import { Button } from '@/components/ui/button';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import { formatInteger } from '@/lib/format';
import { usePracticeSession } from '@/features/practice/hooks/use-practice';
import { useBadges } from '../hooks/use-learning';

export function AchievementsView() {
  const { data: badges, isPending } = useBadges();
  const { data: session } = usePracticeSession();
  const earned = badges?.filter((badge) => badge.earned).length ?? 0;
  const totalXp = session?.xp ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-10">
      {/* Banner de Salón de Logros */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-800 p-6 md:p-8 text-white shadow-xl mb-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-caption font-extrabold uppercase tracking-wider backdrop-blur-md text-amber-100">
              <Trophy aria-hidden className="size-3.5" />
              Vitrina de Logros
            </span>
            <h1 className="mt-3 text-display-sm md:text-display font-extrabold tracking-tight text-white">
              Tus Insignias y Recompensas
            </h1>
            <p className="mt-2 text-body-sm md:text-body font-medium text-amber-100 max-w-xl">
              Cada lección completada y racha diaria te acerca a desbloquear títulos exclusivos y certificaciones oficiales.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-md border border-white/20 text-center min-w-[110px]">
              <span className="text-display-sm font-black text-white">{earned}</span>
              <span className="block text-micro font-bold text-amber-200 uppercase">Insignias</span>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-md border border-white/20 text-center min-w-[110px]">
              <span className="text-display-sm font-black text-amber-200">{formatInteger(totalXp)}</span>
              <span className="block text-micro font-bold text-amber-200 uppercase">XP Total</span>
            </div>
          </div>
        </div>

        {/* Ambient glow decoration */}
        <div className="absolute -right-10 -bottom-10 size-56 rounded-full bg-yellow-400/20 blur-3xl pointer-events-none" />
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-heading-sm font-extrabold text-slate-900">Colección de medallas</h2>
          <p className="text-caption font-semibold text-slate-500">
            {badges ? `${earned} de ${badges.length} insignias desbloqueadas` : 'Cargando vitrina…'}
          </p>
        </div>

        <Button asChild variant="tactile" size="md" className="hidden sm:inline-flex">
          <Link href={ROUTES.practice.root}>
            <Sparkles aria-hidden className="size-4" />
            Practicar para ganar XP
          </Link>
        </Button>
      </div>

      {isPending && (
        <>
          <LoadingRegion label="Cargando insignias" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-44 rounded-3xl" />
            ))}
          </div>
        </>
      )}

      {badges && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {badges.map((badge) => (
            <li key={badge.id}>
              <BadgeCard badge={badge} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 sm:hidden">
        <Button asChild size="block" variant="tactile">
          <Link href={ROUTES.practice.root}>Practicar para ganar XP</Link>
        </Button>
      </div>
    </div>
  );
}

