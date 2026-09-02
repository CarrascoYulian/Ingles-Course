'use client';

import { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileAudio,
  FileText,
  GraduationCap,
  ListChecks,
  Lock,
  PlayCircle,
  Trophy,
  Video,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useModuleLessons } from '@/features/learning/hooks/use-learning';
import { cn } from '@/lib/utils';
import type { BlockType, Lesson, Module } from '@/types';

const TYPE_ICON: Record<BlockType, typeof Video> = {
  Video: Video,
  PDF: FileText,
  Audio: FileAudio,
  Ejercicio: ListChecks,
  Evaluación: Trophy,
};

export interface CourseUnitsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseTitle: string;
  courseLevel: string;
  modules: Module[];
  activeModuleId: string;
  onSelectLesson: (module: Module, lesson: Lesson) => void;
}

export function CourseUnitsModal({
  open,
  onOpenChange,
  courseTitle,
  courseLevel,
  modules,
  activeModuleId,
  onSelectLesson,
}: CourseUnitsModalProps) {
  const [expandedModuleIds, setExpandedModuleIds] = useState<Set<string>>(
    () => new Set([activeModuleId]),
  );

  const toggleExpand = (moduleId: string) => {
    setExpandedModuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={720} className="max-h-[85vh] overflow-hidden p-0 rounded-3xl dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        {/* Encabezado del modal estilo Coursera / LinkedIn Learning */}
        <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-sm">
                <GraduationCap aria-hidden size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-micro font-extrabold uppercase tracking-widest text-brand dark:text-blue-400">
                  Plan de Estudios Oficial
                </span>
                <DialogTitle className="truncate text-body sm:text-title font-extrabold text-slate-900 dark:text-white">
                  {courseTitle}
                </DialogTitle>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span className="hidden sm:inline-flex rounded-full bg-blue-100 dark:bg-blue-950 px-3 py-1 text-caption font-extrabold text-brand dark:text-blue-300">
                Nivel {courseLevel}
              </span>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Cerrar temario"
                className="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                <X aria-hidden size={18} strokeWidth={2.4} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 text-caption font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <BookOpen aria-hidden size={15} className="text-brand" />
              {modules.length} {modules.length === 1 ? 'Unidad' : 'Unidades'} en total
            </span>
            <span>•</span>
            <span>Navega y repasa los contenidos desbloqueados</span>
          </div>
        </div>

        {/* Lista de unidades en acordeón interactivo */}
        <div className="max-h-[calc(85vh-130px)] overflow-y-auto p-6 space-y-3.5">
          {modules.map((module, index) => {
            const isActive = module.id === activeModuleId;
            const isExpanded = expandedModuleIds.has(module.id);

            return (
              <UnitAccordionItem
                key={module.id}
                module={module}
                unitIndex={index + 1}
                isActive={isActive}
                isExpanded={isExpanded}
                onToggle={() => toggleExpand(module.id)}
                onSelectLesson={(lesson) => {
                  onSelectLesson(module, lesson);
                  onOpenChange(false);
                }}
              />
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface UnitAccordionItemProps {
  module: Module;
  unitIndex: number;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectLesson: (lesson: Lesson) => void;
}

function UnitAccordionItem({
  module,
  unitIndex,
  isActive,
  isExpanded,
  onToggle,
  onSelectLesson,
}: UnitAccordionItemProps) {
  const { data: lessons, isPending } = useModuleLessons(module.id);

  const completedCount = lessons?.filter((l) => l.state === 'done').length ?? 0;
  const totalLessons = lessons?.length ?? 0;
  const isModuleDone = totalLessons > 0 && completedCount === totalLessons;
  const isModuleLocked = lessons ? lessons.every((l) => l.state === 'locked') : false;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-200 overflow-hidden',
        isActive
          ? 'border-brand/50 bg-blue-50/20 dark:bg-blue-950/20 shadow-sm ring-1 ring-brand/30'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700',
        isModuleLocked && 'opacity-65',
      )}
    >
      {/* Botón encabezado de la unidad */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-3 sm:p-4 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors"
      >
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div
            className={cn(
              'grid size-9 sm:size-10 shrink-0 place-items-center rounded-xl font-extrabold text-caption shadow-sm transition-all',
              isModuleDone
                ? 'bg-emerald-500 text-white'
                : isActive
                  ? 'bg-brand text-white shadow-glow'
                  : isModuleLocked
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200',
            )}
          >
            {isModuleDone ? (
              <CheckCircle2 aria-hidden size={18} />
            ) : isModuleLocked ? (
              <Lock aria-hidden size={16} />
            ) : (
              `U${unitIndex}`
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-micro font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Unidad {unitIndex}
              </span>
              {isActive && (
                <span className="rounded-full bg-brand/10 dark:bg-brand/20 px-2 py-0.5 text-[10px] font-black text-brand dark:text-blue-300 uppercase">
                  En curso
                </span>
              )}
              {isModuleDone && (
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase">
                  Completada
                </span>
              )}
            </div>
            <h3 className="text-body-sm font-extrabold text-slate-900 dark:text-white truncate">
              {module.title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-caption font-extrabold text-slate-700 dark:text-slate-200 tabular-nums">
              {completedCount} / {totalLessons} lecciones
            </span>
            <span className="text-micro font-medium text-slate-400">{progressPercent}% completado</span>
          </div>

          <div className="text-slate-400 transition-transform">
            {isExpanded ? (
              <ChevronDown aria-hidden size={20} />
            ) : (
              <ChevronRight aria-hidden size={20} />
            )}
          </div>
        </div>
      </button>

      {/* Barra de progreso de la unidad */}
      <div className="px-4 pb-1">
        <Progress
          value={progressPercent}
          height={4}
          tone={isModuleDone ? 'success' : 'accent'}
          className="bg-slate-100"
          label={`Progreso de la unidad ${unitIndex}`}
        />
      </div>

      {/* Contenido desplegado de lecciones */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-3.5 space-y-1.5">
          {isPending && (
            <div className="space-y-2 py-2">
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
            </div>
          )}

          {lessons && lessons.length > 0 && (
            <ul className="space-y-1">
              {lessons.map((lesson) => {
                const isCurrent = lesson.state === 'current';
                const isDone = lesson.state === 'done';
                const isLocked = lesson.state === 'locked';
                const TypeIcon = TYPE_ICON[lesson.type] || Video;

                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => {
                        if (isLocked) {
                          toast(`Completa las lecciones previas para desbloquear esta.`);
                          return;
                        }
                        onSelectLesson(lesson);
                      }}
                      className={cn(
                        'group flex w-full items-center justify-between gap-3 rounded-xl p-2.5 text-left transition-all',
                        isCurrent
                          ? 'border border-blue-200 bg-blue-50/90 shadow-sm text-brand'
                          : isDone
                            ? 'bg-white hover:bg-slate-100/80 border border-slate-100 text-slate-800'
                            : isLocked
                              ? 'bg-transparent text-slate-400 cursor-not-allowed'
                              : 'bg-white hover:bg-blue-50/50 border border-slate-100 text-slate-800',
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'grid size-8 shrink-0 place-items-center rounded-lg text-caption transition-all',
                            isDone
                              ? 'bg-emerald-100 text-emerald-600'
                              : isCurrent
                                ? 'bg-brand text-white shadow-sm'
                                : isLocked
                                  ? 'bg-slate-100 text-slate-400'
                                  : 'bg-slate-100 text-slate-600 group-hover:text-brand group-hover:bg-blue-100',
                          )}
                        >
                          {isDone ? (
                            <CheckCircle2 aria-hidden size={16} />
                          ) : isLocked ? (
                            <Lock aria-hidden size={13} />
                          ) : isCurrent ? (
                            <PlayCircle aria-hidden size={16} className="animate-pulse" />
                          ) : (
                            <TypeIcon aria-hidden size={14} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p
                            className={cn(
                              'text-caption font-extrabold truncate',
                              isCurrent ? 'text-brand' : isLocked ? 'text-slate-400' : 'text-slate-900',
                            )}
                          >
                            {lesson.order}. {lesson.title}
                          </p>
                          <span className="text-[11px] font-medium text-slate-400">
                            {lesson.type} • {lesson.duration || '5 min'}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1 text-micro font-extrabold">
                        {isDone && <span className="text-emerald-600">✓ Vista</span>}
                        {isCurrent && <span className="text-brand">Reproduciendo</span>}
                        {isLocked && <span className="text-slate-400">Bloqueada</span>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {lessons && lessons.length === 0 && !isPending && (
            <p className="py-3 text-center text-caption font-medium text-slate-400">
              Esta unidad todavía no tiene lecciones publicadas.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
