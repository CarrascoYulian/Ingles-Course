'use client';

import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';

import { Hearts, StatPills } from '@/components/duolingo/stat-pills';
import { Progress } from '@/components/ui/progress';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';
import type { PracticeSession } from '@/types';

export interface PracticeHeaderProps {
  session: PracticeSession;
  levelTitle: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

function SoundToggle({
  enabled,
  onToggle,
  className,
}: {
  enabled: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={enabled ? 'Silenciar sonido de la práctica' : 'Activar sonido de la práctica'}
      className={cn(
        'grid size-[34px] shrink-0 place-items-center rounded-lg bg-surface-sunken text-fg-muted transition-colors duration-[160ms] hover:bg-line [@media(hover:hover)_and_(pointer:fine)]:active:scale-[0.97]',
        className,
      )}
    >
      {enabled ? (
        <Volume2 aria-hidden size={16} strokeWidth={2.2} />
      ) : (
        <VolumeX aria-hidden size={16} strokeWidth={2.2} />
      )}
    </button>
  );
}

/**
 * Cabecera de la práctica.
 *
 * En móvil la barra de progreso comparte línea con el botón de volver y las
 * vidas — el alumno necesita ver «cuánto falta» y «cuánto me queda» de un
 * vistazo, sin gastar altura de pantalla.
 */
export function PracticeHeader({
  session,
  levelTitle,
  soundEnabled,
  onToggleSound,
}: PracticeHeaderProps) {
  const percent = (session.step / session.totalSteps) * 100;

  return (
    <header className="border-b border-line bg-surface px-[18px] py-2.5 md:border-line md:px-[30px] md:py-4">
      {/* Escritorio */}
      <div className="hidden items-center justify-between gap-6 md:flex">
        <div className="flex items-center gap-4">
          <Link
            href={ROUTES.student.curso}
            aria-label="Volver a mi curso"
            className="grid size-[34px] place-items-center rounded-lg bg-surface-sunken text-fg-muted transition-colors duration-[160ms] hover:bg-line [@media(hover:hover)_and_(pointer:fine)]:active:scale-[0.97]"
          >
            <ArrowLeft aria-hidden size={16} strokeWidth={2.2} />
          </Link>
          <div>
            <h1 className="text-title-sm font-extrabold tracking-tight-2 text-fg">
              BerthoGo · Unidad 3
            </h1>
            <p className="text-meta font-semibold text-fg-ghost">
              Vocabulario y gramática · {session.step} de {session.totalSteps} ejercicios
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatPills streak={session.streak} xp={session.xp} />
          <SoundToggle enabled={soundEnabled} onToggle={onToggleSound} />
        </div>
      </div>

      {/* Móvil */}
      <div className="md:hidden">
        <div className="flex items-center gap-2.5">
          <Link
            href={ROUTES.student.curso}
            aria-label="Volver a mi curso"
            className="grid size-[30px] shrink-0 place-items-center rounded-md bg-surface-sunken text-fg-muted"
          >
            <ArrowLeft aria-hidden size={15} strokeWidth={2.2} />
          </Link>
          <Progress
            value={percent}
            height={8}
            className="flex-1 bg-line"
            label={`Progreso de ${levelTitle}`}
          />
          <Hearts total={session.hearts.total} remaining={session.hearts.remaining} />
          <SoundToggle enabled={soundEnabled} onToggle={onToggleSound} className="size-[30px]" />
        </div>
        <StatPills
          streak={session.streak}
          xp={session.xp}
          stretch
          className="mt-3"
        />
      </div>
    </header>
  );
}
