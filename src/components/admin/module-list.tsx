'use client';

import { ArrowDown, ArrowUp, Lock, MoreVertical, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { avatarColorFor } from '@/constants/palettes';
import { cn } from '@/lib/utils';
import type { Module } from '@/types';

export interface ModuleListProps {
  modules: Module[];
  activeModuleId: string;
  onSelect: (module: Module) => void;
  onCreate: () => void;
  onRename: (module: Module) => void;
  onDelete: (module: Module) => void;
  onReorder: (module: Module, direction: -1 | 1) => void;
  onDuplicate: (module: Module) => void;
  duplicatePending?: boolean;
  canDelete: boolean;
}

/**
 * Raíl vertical de módulos del constructor de contenido — antes era una fila
 * horizontal de chips arriba del editor, que con más de 4-5 módulos se
 * volvía una tira ilegible de scroll lateral. El patrón de lista vertical
 * con el módulo activo resaltado es el mismo que usan los constructores de
 * curso de Coursera/Udemy/LinkedIn Learning (y el mismo lenguaje visual que
 * ya usa `LessonList` del lado del alumno, sólo sin el estado de
 * visto/bloqueado que no aplica aquí).
 */
export function ModuleList({
  modules,
  activeModuleId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onReorder,
  onDuplicate,
  duplicatePending,
  canDelete,
}: ModuleListProps) {
  return (
    <Card padding="sm" radius="xl" className="flex flex-col gap-1">
      <p className="px-2 pb-1 pt-1 text-tiny font-extrabold tracking-eyebrow text-fg-ghost">
        MÓDULOS DEL CURSO
      </p>

      <ol className="flex flex-col gap-1">
        {modules.map((module, index) => {
          const isActive = module.id === activeModuleId;
          const color = avatarColorFor(module.id);
          const isFirst = index === 0;
          const isLast = index === modules.length - 1;

          return (
            <li
              key={module.id}
              className={cn(
                'group flex items-center gap-1 rounded-2xl border-l-[3px] pr-1',
                'transition-[background-color,border-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
                isActive ? 'border-accent bg-accent-tint' : 'border-transparent hover:bg-surface-muted',
              )}
            >
              <button
                type="button"
                aria-current={isActive ? 'true' : undefined}
                onClick={() => onSelect(module)}
                className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-2.5 pr-1 text-left"
              >
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-tiny font-extrabold text-white"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
                >
                  {module.position + 1}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block truncate text-body-sm',
                      isActive ? 'font-bold text-fg-strong' : 'font-semibold text-fg-strong',
                    )}
                  >
                    {module.title}
                  </span>
                  {module.requiresModuleId && (
                    <span className="mt-0.5 flex items-center gap-1 text-tiny font-bold text-fg-disabled">
                      <Lock aria-hidden size={10} strokeWidth={2.4} />
                      Requiere el anterior
                    </span>
                  )}
                </span>
              </button>

              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-[160ms] focus-within:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100">
                <Button
                  variant="icon"
                  size="square"
                  onClick={() => onReorder(module, -1)}
                  disabled={isFirst}
                  aria-label={`Subir “${module.title}”`}
                  className="size-6 disabled:opacity-40"
                >
                  <ArrowUp aria-hidden size={11} strokeWidth={2.4} />
                </Button>
                <Button
                  variant="icon"
                  size="square"
                  onClick={() => onReorder(module, 1)}
                  disabled={isLast}
                  aria-label={`Bajar “${module.title}”`}
                  className="size-6 disabled:opacity-40"
                >
                  <ArrowDown aria-hidden size={11} strokeWidth={2.4} />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="icon"
                      size="square"
                      aria-label={`Más acciones para “${module.title}”`}
                      className="size-6"
                    >
                      <MoreVertical aria-hidden size={11} strokeWidth={2.4} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onRename(module)}>Renombrar</DropdownMenuItem>
                    <DropdownMenuItem disabled={duplicatePending} onSelect={() => onDuplicate(module)}>
                      Duplicar
                    </DropdownMenuItem>
                    {canDelete && (
                      <DropdownMenuItem variant="danger" onSelect={() => onDelete(module)}>
                        Eliminar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          );
        })}
      </ol>

      <Button
        variant="ghost"
        size="sm"
        onClick={onCreate}
        className="mt-1 justify-start gap-1.5 rounded-xl px-2.5 py-2 text-fg-dim"
      >
        <Plus aria-hidden size={15} strokeWidth={2.4} />
        Nueva unidad
      </Button>
    </Card>
  );
}
