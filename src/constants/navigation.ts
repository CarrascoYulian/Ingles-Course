import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Dog,
  LayoutGrid,
  Mail,
  PlaySquare,
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
    label: 'Cursos y unidades',
    shortLabel: 'Cursos',
    icon: BookOpen,
  },
  {
    href: ROUTES.admin.estudiantes,
    label: 'Estudiantes',
    shortLabel: 'Alumnos',
    icon: Users,
  },
  {
    href: ROUTES.admin.practica,
    label: 'BerthoGo',
    shortLabel: 'BerthoGo',
    icon: Dog,
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
  { href: ROUTES.student.curso, label: 'Mis cursos', shortLabel: 'Mis cursos', icon: PlaySquare },
  { href: ROUTES.practice.root, label: 'BerthoGo', shortLabel: 'BerthoGo', icon: Dog },
  { href: ROUTES.student.tareas, label: 'Tareas', shortLabel: 'Tareas', icon: ClipboardList },
  { href: ROUTES.student.logros, label: 'Logros', shortLabel: 'Logros', icon: Trophy },
  { href: ROUTES.student.mensajes, label: 'Mensajes', shortLabel: 'Mensajes', icon: Mail },
] as const;

/** Copys de cabecera del panel docente, indexados por ruta. */
export const ADMIN_PAGE_META: Record<string, { title: string; action?: string }> = {
  [ROUTES.admin.dashboard]: { title: 'Resumen general', action: 'Nuevo curso' },
  [ROUTES.admin.cursos]: { title: 'Cursos y unidades', action: 'Nuevo curso' },
  [ROUTES.admin.contenido]: { title: 'Constructor de contenido' },
  [ROUTES.admin.estudiantes]: { title: 'Estudiantes', action: 'Nuevo estudiante' },
  [ROUTES.admin.practica]: { title: 'BerthoGo', action: 'Nueva pregunta' },
  [ROUTES.admin.reportes]: { title: 'Reportes', action: 'Exportar CSV' },
  [ROUTES.admin.cuenta]: { title: 'Mi cuenta' },
  [ROUTES.admin.actividad]: { title: 'Actividad' },
};
