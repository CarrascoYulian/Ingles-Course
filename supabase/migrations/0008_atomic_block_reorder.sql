-- Reordenar bloques hacía dos updates independientes vía Promise.all — no
-- atómico: si uno fallaba a mitad de camino, dos bloques podían terminar
-- con la misma `position` y el orden quedaba ambiguo. Este RPC hace el swap
-- dentro de una única transacción con bloqueo de fila.
create or replace function public.swap_content_block_position(
  block_a_id uuid,
  block_b_id uuid
) returns void
language plpgsql
security invoker
as $$
declare
  pos_a int;
  pos_b int;
begin
  select position into pos_a from content_blocks where id = block_a_id for update;
  select position into pos_b from content_blocks where id = block_b_id for update;

  if pos_a is null or pos_b is null then
    raise exception 'Bloque no encontrado';
  end if;

  update content_blocks set position = pos_b where id = block_a_id;
  update content_blocks set position = pos_a where id = block_b_id;
end;
$$;
