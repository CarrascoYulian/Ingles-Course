import type { UserRole } from '@/types';

/**
 * Control de acceso basado en capacidades, no en comprobaciones de rol
 * dispersas. Añadir el rol `instructor` en el futuro es cambiar esta tabla,
 * no perseguir `if (role === 'admin')` por toda la base de código.
 */
export const PERMISSIONS = {
  'course:read': ['admin', 'instructor', 'student'],
  'course:create': ['admin', 'instructor'],
  'course:publish': ['admin'],
  'course:delete': ['admin'],
  'content:edit': ['admin', 'instructor'],
  'content:delete': ['admin'],
  'student:read': ['admin', 'instructor'],
  'student:message': ['admin', 'instructor'],
  'student:invite': ['admin'],
  'student:update': ['admin'],
  'student:delete': ['admin'],
  'student:reset-progress': ['admin'],
  'report:read': ['admin', 'instructor'],
  'report:export': ['admin'],
  'practice:play': ['student', 'admin', 'instructor'],
  'practice:manage': ['admin', 'instructor'],
  'quiz:take': ['student'],
  'assignment:edit': ['admin', 'instructor'],
  'assignment:submit': ['student'],
  'assignment:grade': ['admin', 'instructor'],
  'staff:read': ['admin'],
  'staff:invite': ['admin'],
  'audit:read': ['admin'],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}

/** `admin` e `instructor` comparten el panel docente. */
export function isStaff(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'instructor';
}

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrador',
  instructor: 'Instructor',
  student: 'Estudiante',
};
