-- El % de "Tu progreso" (enrollments.progress) se calculaba dividiendo entre
-- TODAS las lecciones de TODOS los módulos del curso (recalc_enrollment_progress,
-- 0024_lesson_comments_and_progress.sql), sin importar si el alumno tenía
-- acceso otorgado a esos módulos (module_access, 0034_module_access.sql).
--
-- Consecuencia real: un alumno que terminaba el 100 % de los módulos a los
-- que SÍ tiene acceso disparaba en el cliente (course-view.tsx) el modal de
-- "¡Terminaste el curso!" con botón "Ver certificado" — ese cálculo del
-- cliente sólo mira `allModules` (ya filtrado por RLS a los otorgados). Al
-- entrar al certificado, `enrollments.progress` seguía por debajo de 100
-- porque contaba módulos futuros no otorgados todavía, y el certificado se
-- negaba a mostrarse. Ahora ambos cálculos usan el mismo universo: sólo
-- módulos con `module_access` para ese alumno.
create or replace function recalc_enrollment_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course_id uuid;
  v_total_lessons int;
  v_sum_percent numeric;
  v_completed int;
  v_watched_minutes numeric;
begin
  select c.id into v_course_id
  from lessons l
  join modules m on m.id = l.module_id
  join courses c on c.id = m.course_id
  where l.id = new.lesson_id;

  if v_course_id is null then
    return new;
  end if;

  select count(*) into v_total_lessons
  from lessons l
  join modules m on m.id = l.module_id
  join module_access ma on ma.module_id = m.id and ma.student_id = new.student_id
  where m.course_id = v_course_id;

  select
    coalesce(sum(lp.watched_percent), 0),
    count(*) filter (where lp.completed_at is not null),
    coalesce(sum(coalesce(l.duration_seconds, l.duration_minutes * 60) * lp.watched_percent / 100.0), 0) / 60.0
  into v_sum_percent, v_completed, v_watched_minutes
  from lesson_progress lp
  join lessons l on l.id = lp.lesson_id
  join modules m on m.id = l.module_id
  join module_access ma on ma.module_id = m.id and ma.student_id = lp.student_id
  where m.course_id = v_course_id and lp.student_id = new.student_id;

  update enrollments
  set
    progress = case when v_total_lessons > 0 then least(100, v_sum_percent / v_total_lessons) else 0 end,
    completed_lessons = v_completed,
    watched_minutes = round(v_watched_minutes)
  where student_id = new.student_id and course_id = v_course_id;

  return new;
end;
$$;

-- Backfill: recalcula con la fórmula corregida las matrículas existentes.
update enrollments e
set
  progress = coalesce(sub.avg_percent, 0),
  completed_lessons = coalesce(sub.completed, 0),
  watched_minutes = coalesce(sub.watched_minutes, 0)
from (
  select
    en.student_id,
    en.course_id,
    case when lesson_counts.total > 0 then least(100, coalesce(lp_sum.sum_percent, 0) / lesson_counts.total) else 0 end as avg_percent,
    coalesce(lp_sum.completed, 0) as completed,
    round(coalesce(lp_sum.watched_minutes, 0)) as watched_minutes
  from enrollments en
  join lateral (
    select count(*) as total
    from lessons l
    join modules m on m.id = l.module_id
    join module_access ma on ma.module_id = m.id and ma.student_id = en.student_id
    where m.course_id = en.course_id
  ) lesson_counts on true
  left join lateral (
    select
      sum(lp.watched_percent) as sum_percent,
      count(*) filter (where lp.completed_at is not null) as completed,
      sum(coalesce(l.duration_seconds, l.duration_minutes * 60) * lp.watched_percent / 100.0) / 60.0 as watched_minutes
    from lesson_progress lp
    join lessons l on l.id = lp.lesson_id
    join modules m on m.id = l.module_id
    join module_access ma on ma.module_id = m.id and ma.student_id = lp.student_id
    where m.course_id = en.course_id and lp.student_id = en.student_id
  ) lp_sum on true
) sub
where e.student_id = sub.student_id and e.course_id = sub.course_id;
