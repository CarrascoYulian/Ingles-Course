-- "Archivar curso": un estado intermedio entre publicado/borrador y
-- eliminado definitivamente. Antes la única forma de "quitar de en medio"
-- un curso viejo era borrarlo del todo (irreversible, se lleva puestos
-- todos los archivos en R2) o dejarlo como borrador (sigue apareciendo
-- en la lista normal del panel, mezclado con los cursos activos).
alter table courses add column archived boolean not null default false;

-- Un curso archivado nunca es visible para alumnos, sin importar
-- `published` — evita tener que despublicar a mano antes de archivar.
drop policy if exists "cursos publicados visibles" on courses;
create policy "cursos publicados visibles"
  on courses for select using ((published and not archived) or is_staff());
