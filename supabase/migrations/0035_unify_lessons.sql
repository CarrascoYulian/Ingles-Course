-- ============================================================================
-- Unifica content_blocks / lessons / course_resources en una sola tabla.
--
-- Hasta ahora el editor de módulos guardaba todo en `content_blocks`
-- (cualquier tipo), pero `attachUpload` bifurcaba: un Video creaba además
-- una fila en `lessons` (lo único que alimenta "Contenido del módulo" del
-- alumno); cualquier otro tipo creaba una fila en `course_resources` (se
-- veía aparte, en "Recursos"). Las tres tablas no tenían FK entre sí — sólo
-- compartían `media_key` como string — y ya tenían tres secuencias de
-- `position` independientes que divergían entre sí: reordenar en el editor
-- sólo movía `content_blocks.position`, nunca `lessons.position` ni
-- `course_resources.position`. Resultado: un PDF subido en el editor nunca
-- aparecía en la barra de progreso del alumno.
--
-- Se conserva `lessons` como única fuente de verdad (ya tenía la
-- infraestructura correcta: RLS por `module_access`, el trigger
-- `recalc_enrollment_progress`, y las FK de `lesson_progress`/
-- `lesson_comments`/`lesson_notes`) y se le agregan las columnas que sólo
-- tenía `content_blocks`. `content_blocks` y `course_resources` desaparecen.
-- ============================================================================

alter table lessons
  add column type block_type not null default 'Video',
  add column meta text not null default '',
  add column uploaded_by uuid references profiles(id) on delete set null;

-- Backfill de meta/uploaded_by en lecciones Video existentes, uniendo por
-- media_key con content_blocks (que todavía existe en este punto).
update lessons l
set meta = cb.meta, uploaded_by = cb.uploaded_by
from content_blocks cb
where cb.media_key = l.media_key and cb.type = 'Video' and l.media_key is not null;

-- Reconstruye el orden por módulo usando content_blocks.position como
-- fuente de verdad (es el orden real que el docente arma a mano en el
-- editor, el que hay que preservar). Los bloques Video se resuelven contra
-- su fila de `lessons` ya existente (unida por media_key) y sólo se le
-- reasigna la posición; cualquier otro tipo (incluido un Video huérfano sin
-- fila de lección, caso defensivo que no debería darse) se inserta como
-- fila nueva. Las filas nuevas quedan registradas en una tabla temporal
-- para el backfill retroactivo de progreso que sigue abajo.
create temporary table _migrated_new_lessons (id uuid, module_id uuid) on commit drop;

do $$
declare
  m record;
  cb record;
  next_pos int;
  updated_count int;
  new_id uuid;
begin
  for m in select distinct module_id from content_blocks loop
    next_pos := 0;
    for cb in select * from content_blocks where module_id = m.module_id order by position loop
      if cb.type = 'Video' and cb.media_key is not null then
        update lessons set position = next_pos
        where module_id = m.module_id and media_key = cb.media_key;
        get diagnostics updated_count = row_count;
        if updated_count = 0 then
          insert into lessons (module_id, position, title, media_key, type, meta, uploaded_by)
          values (m.module_id, next_pos, cb.title, cb.media_key, cb.type, cb.meta, cb.uploaded_by)
          returning id into new_id;
          insert into _migrated_new_lessons values (new_id, m.module_id);
        end if;
      else
        insert into lessons (module_id, position, title, media_key, type, meta, uploaded_by)
        values (m.module_id, next_pos, cb.title, cb.media_key, cb.type, cb.meta, cb.uploaded_by)
        returning id into new_id;
        insert into _migrated_new_lessons values (new_id, m.module_id);
      end if;
      next_pos := next_pos + 1;
    end loop;
  end loop;
end $$;

-- Backfill retroactivo de progreso: si un alumno ya había completado TODAS
-- las lecciones Video preexistentes de un módulo, la fila nueva (no-video)
-- que ese módulo acaba de ganar también nace completada — sin esto, un
-- módulo que un alumno ya había terminado le aparecería con un ítem
-- pendiente después de esta migración. La inserción dispara
-- `recalc_enrollment_progress()` por cada fila, así que no hace falta
-- recalcular `enrollments` aparte.
insert into lesson_progress (student_id, lesson_id, watched_percent, completed_at)
select e.student_id, nl.id, 100, now()
from _migrated_new_lessons nl
join modules mo on mo.id = nl.module_id
join enrollments e on e.course_id = mo.course_id
where not exists (
  select 1 from lessons l2
  where l2.module_id = nl.module_id
    and l2.id <> nl.id
    and l2.type = 'Video'
    and not exists (
      select 1 from lesson_progress lp
      where lp.lesson_id = l2.id and lp.student_id = e.student_id and lp.completed_at is not null
    )
)
on conflict (student_id, lesson_id) do nothing;

-- RPC de reorder para la tabla unificada — mismo cuerpo que
-- swap_content_block_position (0008_atomic_block_reorder.sql), apuntando a
-- `lessons`.
create or replace function public.swap_lesson_position(
  lesson_a_id uuid,
  lesson_b_id uuid
) returns void
language plpgsql
security invoker
as $$
declare
  pos_a int;
  pos_b int;
begin
  select position into pos_a from lessons where id = lesson_a_id for update;
  select position into pos_b from lessons where id = lesson_b_id for update;

  if pos_a is null or pos_b is null then
    raise exception 'Lección no encontrada';
  end if;

  update lessons set position = pos_b where id = lesson_a_id;
  update lessons set position = pos_a where id = lesson_b_id;
end;
$$;

drop function if exists public.swap_content_block_position(uuid, uuid);

-- Borrar una lección pasa a ser exclusivo de admin, igual que ya lo era
-- para content_blocks (0031_content_blocks_delete_admin_only.sql) — ahora
-- que `lessons` también hace de constructor de contenido, hereda la misma
-- restricción.
drop policy if exists "docentes borran lecciones" on lessons;
create policy "admin borra lecciones"
  on lessons for delete using (is_admin());

drop table content_blocks;
drop table course_resources;
