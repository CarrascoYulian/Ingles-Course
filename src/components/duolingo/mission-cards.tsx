import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface MissionCardsProps {
  dailyXp: { earned: number; goal: number };
  weeklyStreak: { done: number; total: number };
  /** `null` cuando ya se alcanzaron todas las insignias por XP. */
  nextBadge: { name: string; requirement: string } | null;
}

/** Tres tarjetas de objetivos bajo el ejercicio. */
export function MissionCards({ dailyXp, weeklyStreak, nextBadge }: MissionCardsProps) {
  const dailyPercent = Math.round((dailyXp.earned / dailyXp.goal) * 100);

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
      <Card>
        <p className="text-meta font-bold text-fg-dim">Misión de hoy</p>
        <p className="mt-1.5 text-body-lg font-extrabold tracking-tight-2 text-fg">
          Gana {dailyXp.goal} XP
        </p>
        <Progress
          value={dailyPercent}
          height={5}
          className="mt-2.5"
          label="Misión diaria de experiencia"
        />
        <p className="mt-1.5 text-caption font-bold text-fg-ghost">
          {dailyXp.earned} / {dailyXp.goal} XP
        </p>
      </Card>

      <Card>
        <p className="text-meta font-bold text-fg-dim">Desafío semanal</p>
        <p className="mt-1.5 text-body-lg font-extrabold tracking-tight-2 text-fg">
          {weeklyStreak.total} días de racha
        </p>
        <p
          aria-label={`${weeklyStreak.done} de ${weeklyStreak.total} días completados`}
          className="mt-[11px] flex gap-[5px]"
        >
          {Array.from({ length: weeklyStreak.total }, (_, index) => (
            <span
              key={index}
              aria-hidden
              className={cn(
                'h-[22px] flex-1 rounded-md',
                index < weeklyStreak.done ? 'bg-success' : 'bg-line-soft',
              )}
            />
          ))}
        </p>
      </Card>

      <Card variant="ink">
        <p className="text-meta font-bold text-ink-fg-soft">Próxima insignia</p>
        <p className="mt-1.5 text-body-lg font-extrabold tracking-tight-2 text-white">
          {nextBadge?.name ?? 'Todas conseguidas'}
        </p>
        <p className="mt-2.5 text-caption font-bold text-ink-fg-dim">
          {nextBadge?.requirement ?? '¡Ya tienes todas las insignias por XP!'}
        </p>
      </Card>
    </div>
  );
}
