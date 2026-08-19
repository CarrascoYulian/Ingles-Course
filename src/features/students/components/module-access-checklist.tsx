'use client';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { Module } from '@/types';

export interface ModuleAccessChecklistProps {
  modules: Module[] | undefined;
  modulesPending: boolean;
  selectedModuleIds: Set<string>;
  onChange: (next: Set<string>) => void;
}

/**
 * Checklist de módulos reutilizado por "Matricular en curso" y "Dar acceso a
 * módulos" — matricular sin otorgar acceso a ninguno deja al alumno viendo
 * un curso vacío, así que quien use esto debe bloquear el submit si
 * `selectedModuleIds.size === 0`.
 */
export function ModuleAccessChecklist({
  modules,
  modulesPending,
  selectedModuleIds,
  onChange,
}: ModuleAccessChecklistProps) {
  if (modulesPending) {
    return <p className="text-body-sm font-semibold text-fg-faint">Cargando módulos…</p>;
  }

  if (!modules || modules.length === 0) {
    return (
      <EmptyState
        compact
        title="Este curso no tiene módulos todavía"
        description="Crea al menos un módulo desde “Cursos y módulos” antes de dar acceso."
      />
    );
  }

  const toggle = (moduleId: string) => {
    const next = new Set(selectedModuleIds);
    if (next.has(moduleId)) next.delete(moduleId);
    else next.add(moduleId);
    onChange(next);
  };

  const allSelected = modules.every((m) => selectedModuleIds.has(m.id));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-tiny font-bold text-fg-ghost">Módulos con acceso</p>
        <Button
          type="button"
          variant="quiet"
          size="xs"
          onClick={() => onChange(allSelected ? new Set() : new Set(modules.map((m) => m.id)))}
        >
          {allSelected ? 'Quitar todos' : 'Seleccionar todos'}
        </Button>
      </div>

      <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto">
        {modules.map((module) => (
          <li key={module.id}>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-body-sm font-semibold text-fg hover:bg-surface-sunken">
              <input
                type="checkbox"
                checked={selectedModuleIds.has(module.id)}
                onChange={() => toggle(module.id)}
                aria-label={`Dar acceso a ${module.title}`}
                className="size-4 shrink-0 cursor-pointer accent-accent"
              />
              {module.title}
            </label>
          </li>
        ))}
      </ul>

      {selectedModuleIds.size === 0 && (
        <p className="text-tiny font-bold text-danger">Selecciona al menos un módulo.</p>
      )}
    </div>
  );
}
