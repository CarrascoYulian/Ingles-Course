-- Mismo patrón que `swap_content_block_position` (migración 0008): reordenar
-- con dos updates independientes no es atómico. Se aplica aquí para no
-- reintroducir la misma condición de carrera al añadir reordenamiento de
-- cursos.
create or replace function public.swap_course_position(
  course_a_id uuid,
  course_b_id uuid
) returns void
language plpgsql
security invoker
as $$
declare
  pos_a int;
  pos_b int;
begin
  select position into pos_a from courses where id = course_a_id for update;
  select position into pos_b from courses where id = course_b_id for update;

  if pos_a is null or pos_b is null then
    raise exception 'Curso no encontrado';
  end if;

  update courses set position = pos_b where id = course_a_id;
  update courses set position = pos_a where id = course_b_id;
end;
$$;
