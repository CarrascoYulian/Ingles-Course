import { describe, expect, it } from 'vitest';

import { can, isStaff } from './rbac';

describe('can', () => {
  it('niega todo a un rol nulo o ausente', () => {
    expect(can(null, 'course:read')).toBe(false);
    expect(can(undefined, 'practice:play')).toBe(false);
  });

  it('deja a un estudiante jugar práctica pero no crear cursos', () => {
    expect(can('student', 'practice:play')).toBe(true);
    expect(can('student', 'course:create')).toBe(false);
  });

  it('deja a instructor gestionar contenido pero no publicar ni eliminar cursos', () => {
    expect(can('instructor', 'content:edit')).toBe(true);
    expect(can('instructor', 'course:publish')).toBe(false);
    expect(can('instructor', 'course:delete')).toBe(false);
  });

  it('el admin tiene los permisos exclusivos que instructor no tiene', () => {
    expect(can('admin', 'course:publish')).toBe(true);
    expect(can('admin', 'course:delete')).toBe(true);
    expect(can('admin', 'student:invite')).toBe(true);
    expect(can('instructor', 'student:invite')).toBe(false);
  });
});

describe('isStaff', () => {
  it('admin e instructor son personal docente', () => {
    expect(isStaff('admin')).toBe(true);
    expect(isStaff('instructor')).toBe(true);
  });

  it('un estudiante o rol vacío no lo son', () => {
    expect(isStaff('student')).toBe(false);
    expect(isStaff(null)).toBe(false);
    expect(isStaff(undefined)).toBe(false);
  });
});
