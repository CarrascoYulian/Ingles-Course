'use client';

import { useEffect, useMemo, useState } from 'react';
import { Award, Bell, BookOpen, Check, CheckCheck, Clock } from 'lucide-react';
import Link from 'next/link';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROUTES } from '@/constants/routes';
import { useMyNotifications } from '@/features/learning/hooks/use-learning';
import { cn } from '@/lib/utils';
import type { AssignmentNotificationTarget } from '@/types';

const STORAGE_KEY = 'bertho_student_read_notifications_v1';

function getStoredReadKeys(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadKeys(keys: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(keys)));
  } catch {
    // Ignorar errores de cuota en storage
  }
}

export function StudentNotificationBell() {
  const { data } = useMyNotifications();
  const [readKeys, setReadKeys] = useState<Set<string>>(() => new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setReadKeys(getStoredReadKeys());
    setMounted(true);
  }, []);

  const rawDueSoon = data?.dueSoon.count ?? 0;
  const rawNewAssignments = data?.newAssignments.count ?? 0;
  const rawGraded = data?.graded.count ?? 0;
  const urgent = data?.dueSoon.urgent ?? false;

  // Generar identificadores estables para cada tipo de notificación
  const dueSoonKey = useMemo(
    () => `dueSoon_${data?.dueSoon.target?.assignmentId ?? 'all'}_${rawDueSoon}`,
    [data?.dueSoon.target?.assignmentId, rawDueSoon],
  );
  const newAssignmentsKey = useMemo(
    () => `new_${data?.newAssignments.target?.assignmentId ?? 'all'}_${rawNewAssignments}`,
    [data?.newAssignments.target?.assignmentId, rawNewAssignments],
  );
  const gradedKey = useMemo(
    () => `graded_${data?.graded.target?.assignmentId ?? 'all'}_${rawGraded}`,
    [data?.graded.target?.assignmentId, rawGraded],
  );

  const isDueSoonRead = mounted && readKeys.has(dueSoonKey);
  const isNewAssignmentsRead = mounted && readKeys.has(newAssignmentsKey);
  const isGradedRead = mounted && readKeys.has(gradedKey);

  const dueSoonCount = isDueSoonRead ? 0 : rawDueSoon;
  const newAssignmentsCount = isNewAssignmentsRead ? 0 : rawNewAssignments;
  const gradedCount = isGradedRead ? 0 : rawGraded;

  const unreadTotal = dueSoonCount + newAssignmentsCount + gradedCount;
  const hasAnyNotification = rawDueSoon > 0 || rawNewAssignments > 0 || rawGraded > 0;

  const markAsRead = (key: string) => {
    setReadKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      saveReadKeys(next);
      return next;
    });
  };

  const markAllAsRead = () => {
    setReadKeys((prev) => {
      const next = new Set(prev);
      if (rawDueSoon > 0) next.add(dueSoonKey);
      if (rawNewAssignments > 0) next.add(newAssignmentsKey);
      if (rawGraded > 0) next.add(gradedKey);
      saveReadKeys(next);
      return next;
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={unreadTotal > 0 ? `${unreadTotal} notificaciones sin leer` : 'Notificaciones'}
          className={cn(
            'relative grid size-9 shrink-0 place-items-center rounded-xl border border-line-strong bg-surface text-fg-subtle',
            'transition-all duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-fg-placeholder hover:text-fg',
          )}
        >
          <Bell aria-hidden size={16} strokeWidth={1.9} />
          {unreadTotal > 0 && (
            <span
              className={cn(
                'absolute -right-1 -top-1 grid size-[18px] place-items-center rounded-full text-micro font-black text-white shadow-sm ring-2 ring-white',
                urgent ? 'bg-danger animate-pulse' : 'bg-brand',
              )}
            >
              {unreadTotal > 9 ? '9+' : unreadTotal}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[300px] p-2">
        {/* Cabecera del desplegable */}
        <div className="flex items-center justify-between px-2.5 py-1.5 pb-2">
          <span className="text-caption font-extrabold text-slate-900">Notificaciones</span>
          {unreadTotal > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:underline"
            >
              <CheckCheck aria-hidden size={13} strokeWidth={2.2} />
              Marcar como leídas
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="my-1" />

        {/* Filas de notificaciones */}
        {rawDueSoon > 0 && (
          <NotificationRow
            target={data?.dueSoon.target}
            label={urgent ? '¡Tarea vence mañana!' : 'Tareas por vencer'}
            count={rawDueSoon}
            isRead={isDueSoonRead}
            icon={Clock}
            tone={urgent ? 'danger' : 'warning'}
            onClick={() => markAsRead(dueSoonKey)}
          />
        )}

        {rawNewAssignments > 0 && (
          <NotificationRow
            target={data?.newAssignments.target}
            label="Nueva tarea asignada"
            count={rawNewAssignments}
            isRead={isNewAssignmentsRead}
            icon={BookOpen}
            tone="brand"
            onClick={() => markAsRead(newAssignmentsKey)}
          />
        )}

        {rawGraded > 0 && (
          <NotificationRow
            target={data?.graded.target}
            label="Tarea calificada por el docente"
            count={rawGraded}
            isRead={isGradedRead}
            icon={Award}
            tone="success"
            onClick={() => markAsRead(gradedKey)}
          />
        )}

        {!hasAnyNotification && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <span className="grid size-8 place-items-center rounded-full bg-slate-100 text-slate-400">
              <Check aria-hidden size={16} strokeWidth={2.4} />
            </span>
            <p className="mt-2 text-caption font-bold text-slate-700">Sin novedades pendientes</p>
            <p className="text-micro font-medium text-slate-400">Estás al día con todas tus tareas.</p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface NotificationRowProps {
  target: AssignmentNotificationTarget | null | undefined;
  label: string;
  count: number;
  isRead: boolean;
  icon: typeof Bell;
  tone: 'danger' | 'warning' | 'brand' | 'success';
  onClick: () => void;
}

function NotificationRow({
  target,
  label,
  count,
  isRead,
  icon: Icon,
  tone,
  onClick,
}: NotificationRowProps) {
  const toneBg = {
    danger: 'bg-danger/10 text-danger',
    warning: 'bg-amber-100 text-amber-700',
    brand: 'bg-blue-100 text-brand',
    success: 'bg-emerald-100 text-emerald-700',
  }[tone];

  const content = (
    <div
      className={cn(
        'group flex items-center justify-between gap-3 rounded-xl px-2.5 py-2.5 transition-colors',
        isRead ? 'opacity-55 hover:opacity-90 hover:bg-slate-50' : 'bg-blue-50/40 hover:bg-blue-50/80',
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', toneBg)}>
          <Icon aria-hidden size={15} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className={cn('text-caption font-extrabold truncate', isRead ? 'text-slate-600' : 'text-slate-900')}>
            {label}
          </p>
          <span className="text-[11px] font-medium text-slate-400">
            {isRead ? 'Leída' : 'Sin leer'}
          </span>
        </div>
      </div>

      {!isRead && (
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand text-[10px] font-black text-white shadow-sm">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </div>
  );

  return target ? (
    <Link
      href={ROUTES.student.tareaDeCurso(target.courseId, target.assignmentId)}
      onClick={onClick}
      className="block"
    >
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className="w-full text-left">
      {content}
    </button>
  );
}
