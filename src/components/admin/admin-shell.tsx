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
import { AdminSidebar } from './admin-sidebar';
import { AdminTopbar } from './admin-topbar';

interface AdminHeaderState {
  subtitle: string;
  onAction: (() => void) | null;
}

const AdminHeaderContext = createContext<{
  set: (state: AdminHeaderState) => void;
} | null>(null);

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

export interface AdminShellProps {
  teacherName: string;
  storage: { usedGb: number; totalGb: number };
  children: ReactNode;
}

export function AdminShell({ teacherName, storage, children }: AdminShellProps) {
  const pathname = usePathname();
  const [header, setHeader] = useState<AdminHeaderState>({ subtitle: '', onAction: null });
  const contextValue = useMemo(() => ({ set: setHeader }), []);

  const actionLabel = ADMIN_PAGE_META[pathname]?.action ?? 'Nuevo curso';

  return (
    <AdminHeaderContext.Provider value={contextValue}>
      <div className="flex min-h-dvh bg-surface-muted">
        <AdminSidebar teacherName={teacherName} storage={storage} />

        <div className="flex min-w-0 flex-1 flex-col">
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
