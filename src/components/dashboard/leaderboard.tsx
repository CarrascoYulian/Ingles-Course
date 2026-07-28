import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/shared/section-title';
import { cn } from '@/lib/utils';
import type { LeaderboardEntry } from '@/types';

export interface LeaderboardProps {
  entries: LeaderboardEntry[];
  totalStudents: number;
  onSeeAll?: () => void;
}

/** Ranking del mes. El primer puesto se destaca con fondo ámbar. */
export function Leaderboard({ entries, totalStudents, onSeeAll }: LeaderboardProps) {
  return (
    <Card padding="lg" radius="xl">
      <SectionTitle title="Ranking del mes" description="Por lecciones completadas" />

      <ol className="mt-4 flex flex-col gap-0.5">
        {entries.map((entry) => {
          const isFirst = entry.rank === 1;
          return (
            <li
              key={entry.id}
              className={cn(
                'flex items-center gap-3 rounded-xl p-2.5',
                isFirst ? 'bg-warning-soft' : 'hover:bg-surface-muted',
              )}
            >
              <span
                className={cn(
                  'w-[22px] text-center text-label font-extrabold',
                  isFirst ? 'text-warning-strong' : 'text-fg-ghost',
                )}
              >
                {entry.rank}
              </span>
              <Avatar name={entry.name} color={entry.avatarColor} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-bold text-fg">{entry.name}</p>
                <p className="text-caption font-semibold text-fg-ghost">
                  {entry.enrollmentCode} · {entry.level}
                </p>
              </div>
              <span className="text-body-sm font-extrabold text-fg">{entry.score}</span>
            </li>
          );
        })}
      </ol>

      <Button variant="soft" size="md" onClick={onSeeAll} className="mt-3.5 w-full font-bold">
        Ver los {totalStudents} estudiantes
      </Button>
    </Card>
  );
}
