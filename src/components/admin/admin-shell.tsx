'use client';

import {
  createContext,
  Suspense,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

import { MobileTabBar } from '@/components/shared/mobile-tab-bar';
import { Button } from '@/components/ui/button';
import { ADMIN_PAGE_META } from '@/constants/navigation';
import type { UserRole } from '@/types';
import { AdminSidebar } from './admin-sidebar';
import { AdminTopbar } from './admin-topbar';

interface AdminHeaderState {
  subtitle: string;
  onAction: (() => void) | null;
}

const AdminHeaderContext = createContext<{
  set: (state: AdminHeaderState) => void;
  query: string;
  setQuery: (query: string) => void;
  role: UserRole;
  isSuperAdmin: boolean;
} | null>(null);

/**
 * Rol del usuario logueado en el panel docente, para ocultar en el cliente
 * acciones que el servidor de todos modos rechazaría (ver `PERMISSIONS` en
 * `src/lib/auth/rbac.ts`) — antes sólo el 403 del backend impedía el efecto,
 * pero el botón (p.ej. "Eliminar estudiante") seguía visible para un
 * `instructor` sin ese permiso.
 */
export function useAdminRole(): UserRole {
  const context = useContext(AdminHeaderContext);
  return context?.role ?? 'instructor';
}

/** Dueño del sistema — único que puede invitar, borrar y desactivar a otros admins. */
export function useIsSuperAdmin(): boolean {
  const context = useContext(AdminHeaderContext);
  return context?.isSuperAdmin ?? false;
}

/**
 * Cada sección aporta su subtítulo y su acción primaria; la cabecera es
 * única y vive en el layout. Así el buscador conserva su estado al navegar
 * entre secciones y no se remonta una cabecera por página.
 */
export function useAdminHeader(subtitle: string, onAction?: () => void) {
  const context = useContext(AdminHeaderContext);

  useEffect(() => {
    context?.set({ subtitle, onAction: onAction ?? null });
    // `onAction` se omite a propósito: cambia de identidad en cada render y
    // reinscribirlo provocaría un bucle. El subtítulo sí es la señal real.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtitle]);
}

/**
 * Texto en vivo del buscador, compartido entre `AdminTopbar` (que lo
 * escribe) y la vista de cada sección (que lo lee para filtrar al
 * instante). Antes `useAdminSearch` guardaba `query` en un `useState`
 * propio de cada componente que lo llamaba — dos instancias distintas que
 * sólo se reconciliaban de vuelta a través de la URL, con el mismo retraso
 * del debounce. Escribir "Roberto" en el topbar nunca llegaba de inmediato
 * a `StudentsView`: el filtro instantáneo del listado en realidad esperaba
 * el mismo viaje de red que se quería evitar, y eso era el parpadeo.
 */
export function useSharedSearchQuery(): [string, (query: string) => void] {
  const context = useContext(AdminHeaderContext);
  return [context?.query ?? '', context?.setQuery ?? (() => undefined)];
}

export interface AdminShellProps {
  teacherName: string;
  role: UserRole;
  isSuperAdmin: boolean;
  children: ReactNode;
}

export function AdminShell({ teacherName, role, isSuperAdmin, children }: AdminShellProps) {
  const pathname = usePathname();
  const [header, setHeader] = useState<AdminHeaderState>({ subtitle: '', onAction: null });
  const [query, setQuery] = useState('');
  const contextValue = useMemo(
    () => ({ set: setHeader, query, setQuery, role, isSuperAdmin }),
    [query, role, isSuperAdmin],
  );

  const actionLabel = ADMIN_PAGE_META[pathname]?.action ?? 'Nuevo curso';

  return (
    <AdminHeaderContext.Provider value={contextValue}>
      <div className="flex min-h-dvh bg-surface-muted">
        <AdminSidebar teacherName={teacherName} />

        <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
          {/* AdminTopbar lee el buscador desde la URL (useSearchParams), lo
              que exige un límite de Suspense — si no, Next fuerza el
              renderizado dinámico de cada página del panel al prerenderizar. */}
          <Suspense fallback={null}>
            <AdminTopbar
              subtitle={header.subtitle}
              teacherName={teacherName}
              action={
                header.onAction ? (
                  <Button size="md" onClick={header.onAction}>
                    {actionLabel}
                  </Button>
                ) : null
              }
            />
          </Suspense>

          <main id="contenido-principal" className="flex-1">
            {children}
          </main>

          <MobileTabBar variant="admin" />
        </div>
      </div>
    </AdminHeaderContext.Provider>
  );
}
