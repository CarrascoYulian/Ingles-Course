-- Antes `modules` sólo se podía crear, nunca renombrar/borrar/reordenar
-- desde el panel — el docente que se equivocaba de título o quería
-- reorganizar unidades no tenía forma de arreglarlo sin SQL manual.
--
-- Renombrar y borrar ya los permite la RLS existente ("docentes actualizan
-- módulos" / "docentes borran módulos", migración 0020) con un UPDATE/DELETE
-- normal — no hace falta nada nuevo para esos dos.
--
-- Reordenar sí necesita un RPC atómico: `modules` tiene
-- `unique (course_id, position) deferrable initially deferred` (0001), pero
-- esa garantía sólo aplica dentro de una misma transacción — dos llamadas
-- `.update()` del cliente son dos transacciones separadas, así que si la
-- segunda falla a mitad de camino dos unidades pueden quedar con la misma
-- posición. Mismo patrón exacto que `swap_course_position` (0016).
create or replace function public.swap_module_position(
  module_a_id uuid,
  module_b_id uuid
) returns void
language plpgsql
security invoker
as $$
declare
  pos_a int;
  pos_b int;
  course_a uuid;
  course_b uuid;
begin
  select position, course_id into pos_a, course_a from modules where id = module_a_id for update;
  select position, course_id into pos_b, course_b from modules where id = module_b_id for update;

  if pos_a is null or pos_b is null then
    raise exception 'Unidad no encontrada';
  end if;
  if course_a is distinct from course_b then
    raise exception 'Las unidades deben pertenecer al mismo curso';
  end if;

  update modules set position = pos_b where id = module_a_id;
  update modules set position = pos_a where id = module_b_id;
end;
$$;
