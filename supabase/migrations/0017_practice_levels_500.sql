-- Antes había sólo 5 niveles fijos de práctica. El producto pide que el
-- nivel máximo alcanzable sea 500, con la dificultad de las preguntas
-- acorde al nivel CEFR real del alumno según su progreso: 1-100 → A1,
-- 101-200 → A2, 201-300 → B1, 301-400 → B2, 401-500 → C1.
--
-- No hay ninguna fila de `practice_progress` que dependa del `id` de
-- `practice_levels` (sólo de `position`, un entero), así que regenerar la
-- tabla completa es seguro: cualquier `current_level` 1-5 ya existente
-- sigue siendo una posición válida dentro de 1-500.
alter table practice_levels add column cefr_tier cefr_level;

truncate practice_levels;

insert into practice_levels (position, title, xp_reward, total_steps, cefr_tier)
select
  n,
  'Nivel ' || n || ' · ' || tier,
  case tier
    when 'A1' then 20
    when 'A2' then 25
    when 'B1' then 30
    when 'B2' then 35
    else 40
  end,
  10,
  tier::cefr_level
from generate_series(1, 500) as n
cross join lateral (
  select case
    when n <= 100 then 'A1'
    when n <= 200 then 'A2'
    when n <= 300 then 'B1'
    when n <= 400 then 'B2'
    else 'C1'
  end as tier
) t;

alter table practice_levels alter column cefr_tier set not null;
