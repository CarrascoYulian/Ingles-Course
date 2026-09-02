-- Las tareas se listaban ordenadas por `due_at` — no había forma de que el
-- docente las reordenara a mano (arrastrar y soltar, como ya existe para
-- los bloques de contenido vía `swap_lesson_position`). Se agrega una
-- columna `position` con el mismo patrón: backfill según el orden actual
-- (por fecha de vencimiento, dentro de cada módulo) y un RPC atómico de
-- swap para el reorder por arrastre.
alter table assignments add column position int;

with ranked as (
  select id, row_number() over (partition by module_id order by due_at, created_at) - 1 as rn
  from assignments
)
update assignments a
set position = ranked.rn
from ranked
where ranked.id = a.id;

alter table assignments alter column position set not null;
alter table assignments alter column position set default 0;

-- Mismo patrón exacto que `swap_lesson_position` (0035) / `swap_module_position` (0039).
create or replace function public.swap_assignment_position(
  assignment_a_id uuid,
  assignment_b_id uuid
) returns void
language plpgsql
security invoker
as $$
declare
  pos_a int;
  pos_b int;
  module_a uuid;
  module_b uuid;
begin
  select position, module_id into pos_a, module_a from assignments where id = assignment_a_id for update;
  select position, module_id into pos_b, module_b from assignments where id = assignment_b_id for update;

  if pos_a is null or pos_b is null then
    raise exception 'Tarea no encontrada';
  end if;
  if module_a is distinct from module_b then
    raise exception 'Las tareas deben pertenecer al mismo módulo';
  end if;

  update assignments set position = pos_b where id = assignment_a_id;
  update assignments set position = pos_a where id = assignment_b_id;
end;
$$;
