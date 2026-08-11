-- Sin esta restricción, dos lecciones del mismo módulo podían compartir
-- `position` (p. ej. dos filas con position = 1), lo que hacía que la
-- lógica de "lección actual" (`toLesson` en mappers.ts) marcara dos
-- lecciones como actuales a la vez.
alter table lessons
  add constraint lessons_module_position_unique unique (module_id, position);
