'use client';

import { MoreVertical } from 'lucide-react';

import { useAdminRole } from '@/components/admin/admin-shell';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { can } from '@/lib/auth/rbac';
import type { StudentSummary } from '@/types';

export interface StudentDetailCardProps {
  student: StudentSummary | null;
  onMessage: (student: StudentSummary) => void;
  onReset: (student: StudentSummary) => void;
  onEdit: (student: StudentSummary) => void;
  onDelete: (student: StudentSummary) => void;
  onEnroll: (student: StudentSummary) => void;
  onManageModuleAccess: (student: StudentSummary) => void;
  onToggleActive: (student: StudentSummary) => void;
  /** Tiene al menos un mensaje sin leer por el docente. */
  hasUnreadMessage?: boolean;
}

export function StudentDetailCard({
  student,
  onMessage,
  onReset,
  onEdit,
  onDelete,
  onEnroll,
  onManageModuleAccess,
  onToggleActive,
  hasUnreadMessage,
}: StudentDetailCardProps) {
  const role = useAdminRole();

  if (!student) {
    return (
      <Card padding="lg" className="hidden lg:block">
        <p className="text-body-sm font-semibold text-fg-faint">
          Selecciona un estudiante para ver su ficha.
        </p>
      </Card>
    );
  }

  const { name, enrollmentCode, level, progress, hours, lessons, avatarColor } = student;
  const canUpdate = can(role, 'student:update');
  const canReset = can(role, 'student:reset-progress');
  const canDelete = can(role, 'student:delete');
  const hasDangerZone = canReset || canDelete;

  return (
    <Card padding="lg" aria-label={`Ficha de ${name}`}>
      <div className="flex items-start gap-3">
        <span className="relative shrink-0">
          <Avatar name={name} color={avatarColor} size={44} />
          {hasUnreadMessage && (
            <span
              aria-label="Mensaje sin leer"
              className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-danger ring-2 ring-surface"
            />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-title-xs font-bold tracking-tight-2 text-fg">{name}</h2>
          <p className="text-tiny font-semibold text-fg-ghost">
            {enrollmentCode} · Nivel {level}
          </p>
        </div>
        {hasDangerZone && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="icon"
                size="square"
                aria-label={`Más acciones para ${name}`}
                className="shrink-0"
              >
                <MoreVertical aria-hidden size={14} strokeWidth={2.2} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canReset && (
                <DropdownMenuItem variant="danger" onSelect={() => onReset(student)}>
                  Reiniciar progreso
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem variant="danger" onSelect={() => onDelete(student)}>
                  Eliminar estudiante
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <p className="mt-[18px] text-meta font-bold text-fg-dim">Progreso del curso</p>
      <p className="mt-1 text-display-sm font-extrabold tracking-display-lg text-fg">
        {progress} %
      </p>
      <Progress
        value={progress}
        height={6}
        className="mt-2"
        label={`Progreso de ${name}`}
      />

      <dl className="mt-[18px] grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface-muted p-[13px]">
          <dd className="text-title font-extrabold text-fg">{hours} h</dd>
          <dt className="text-caption font-bold text-fg-ghost">estudiadas</dt>
        </div>
        <div className="rounded-2xl bg-surface-muted p-[13px]">
          <dd className="text-title font-extrabold text-fg">{lessons}</dd>
          <dt className="text-caption font-bold text-fg-ghost">lecciones</dt>
        </div>
      </dl>

      <div className="mt-[18px] flex flex-col gap-2 sm:flex-row lg:flex-col">
        <Button variant="ghost" size="sm" onClick={() => onMessage(student)}>
          Enviar mensaje
        </Button>
        {canUpdate && (
          <>
            <Button variant="ghost" size="sm" onClick={() => onEdit(student)}>
              Editar información
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEnroll(student)}>
              Matricular en curso
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onManageModuleAccess(student)}>
              Dar acceso a módulos
            </Button>
            {student.active ? (
              <Button variant="danger" size="sm" onClick={() => onToggleActive(student)}>
                Desactivar estudiante
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => onToggleActive(student)}>
                Activar estudiante
              </Button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
