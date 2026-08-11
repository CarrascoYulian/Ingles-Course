import {
  BarChart3,
  BookOpen,
  FileText,
  LayoutGrid,
  PlaySquare,
  Star,
  Trophy,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { ROUTES } from './routes';

export interface NavItem {
  href: string;
  /** Etiqueta completa (sidebar de escritorio). */
  label: string;
  /** Etiqueta corta para la barra inferior en móvil. */
  shortLabel: string;
  icon: LucideIcon;
}

/** Panel docente · sección "GESTIÓN". */
export const ADMIN_NAV: readonly NavItem[] = [
  {
    href: ROUTES.admin.dashboard,
    label: 'Dashboard',
    shortLabel: 'Resumen',
    icon: LayoutGrid,
  },
  {
    href: ROUTES.admin.cursos,
    label: 'Cursos y módulos',
    shortLabel: 'Cursos',
    icon: BookOpen,
  },
  {
    href: ROUTES.admin.contenido,
    label: 'Contenido',
    shortLabel: 'Contenido',
    icon: PlaySquare,
  },
  {
    href: ROUTES.admin.estudiantes,
    label: 'Estudiantes',
    shortLabel: 'Alumnos',
    icon: Users,
  },
  {
    href: ROUTES.admin.reportes,
    label: 'Reportes',
    shortLabel: 'Reportes',
    icon: BarChart3,
  },
] as const;

/** Plataforma del alumno. */
export const STUDENT_NAV: readonly NavItem[] = [
  { href: ROUTES.student.curso, label: 'Mi curso', shortLabel: 'Mi curso', icon: PlaySquare },
  { href: ROUTES.practice.root, label: 'Práctica', shortLabel: 'Práctica', icon: Star },
  { href: ROUTES.student.recursos, label: 'Recursos', shortLabel: 'Recursos', icon: FileText },
  { href: ROUTES.student.logros, label: 'Logros', shortLabel: 'Logros', icon: Trophy },
] as const;

/** Copys de cabecera del panel docente, indexados por ruta. */
export const ADMIN_PAGE_META: Record<string, { title: string; action?: string }> = {
  [ROUTES.admin.dashboard]: { title: 'Resumen general', action: 'Nuevo curso' },
  [ROUTES.admin.cursos]: { title: 'Cursos y módulos', action: 'Nuevo curso' },
  [ROUTES.admin.contenido]: { title: 'Constructor de contenido' },
  [ROUTES.admin.estudiantes]: { title: 'Estudiantes', action: 'Nuevo estudiante' },
  [ROUTES.admin.reportes]: { title: 'Reportes', action: 'Exportar CSV' },
};
