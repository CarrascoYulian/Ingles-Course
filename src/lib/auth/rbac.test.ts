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

  it('borrar contenido es sólo de admin aunque instructor pueda editarlo', () => {
    expect(can('admin', 'content:delete')).toBe(true);
    expect(can('instructor', 'content:delete')).toBe(false);
    expect(can('instructor', 'content:edit')).toBe(true);
  });

  it('enviar mensajes es un permiso propio, no un efecto secundario de leer', () => {
    expect(can('admin', 'student:message')).toBe(true);
    expect(can('instructor', 'student:message')).toBe(true);
    expect(can('student', 'student:message')).toBe(false);
  });

  it('sólo el alumno rinde el quiz — el staff lo autoría, no lo toma', () => {
    expect(can('student', 'quiz:take')).toBe(true);
    expect(can('admin', 'quiz:take')).toBe(false);
    expect(can('instructor', 'quiz:take')).toBe(false);
  });

  it('sólo el staff crea/edita tareas — el alumno no', () => {
    expect(can('admin', 'assignment:edit')).toBe(true);
    expect(can('instructor', 'assignment:edit')).toBe(true);
    expect(can('student', 'assignment:edit')).toBe(false);
  });

  it('sólo el alumno entrega una tarea', () => {
    expect(can('student', 'assignment:submit')).toBe(true);
    expect(can('admin', 'assignment:submit')).toBe(false);
    expect(can('instructor', 'assignment:submit')).toBe(false);
  });

  it('sólo el staff califica una tarea', () => {
    expect(can('admin', 'assignment:grade')).toBe(true);
    expect(can('instructor', 'assignment:grade')).toBe(true);
    expect(can('student', 'assignment:grade')).toBe(false);
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
