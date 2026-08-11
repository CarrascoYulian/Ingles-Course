-- Comentarios reales por lección (alumno y docente) + progreso de curso
-- contextual: antes `enrollments.progress` sólo se escribía al resetear
-- (a 0) y nunca se recalculaba cuando `lesson_progress` avanzaba, así que
-- un alumno con el único contenido del curso visto al 100 % seguía viendo
-- 0 % en "Tu progreso". Ahora un trigger recalcula el promedio real sobre
-- TODAS las lecciones del curso (no sólo las que tienen fila de progreso),
-- así que el porcentaje baja solo cuando se sube contenido nuevo.

create table if not exists lesson_comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table lesson_comments enable row level security;

create index if not exists lesson_comments_lesson_id_idx on lesson_comments(lesson_id);

create policy "comentarios visibles con la lección"
on lesson_comments for select
using (
  exists (
    select 1 from lessons l
    join modules m on m.id = l.module_id
    join courses c on c.id = m.course_id
    where l.id = lesson_comments.lesson_id and (c.published or is_staff())
  )
);

create policy "docentes comentan cualquier lección"
on lesson_comments for insert
with check (is_staff() and author_id = (select auth.uid()));

create policy "alumnos comentan lecciones de sus cursos"
on lesson_comments for insert
with check (
  is_active_student()
  and author_id = (select auth.uid())
  and exists (
    select 1 from lessons l
    join modules m on m.id = l.module_id
    join enrollments e on e.course_id = m.course_id
    where l.id = lesson_comments.lesson_id and e.student_id = (select auth.uid())
  )
);

-- Recalcula enrollments.progress/watched_minutes/completed_lessons del
-- estudiante para el curso de la lección que acaba de actualizar su avance.
-- SECURITY DEFINER: el alumno no tiene (ni debe tener) permiso de UPDATE
-- directo sobre `enrollments` vía RLS; el trigger sólo toca la fila de su
-- propio progreso, derivada de la fila que él mismo acaba de escribir.
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
  where m.course_id = v_course_id;

  select
    coalesce(sum(lp.watched_percent), 0),
    count(*) filter (where lp.completed_at is not null),
    coalesce(sum(coalesce(l.duration_seconds, l.duration_minutes * 60) * lp.watched_percent / 100.0), 0) / 60.0
  into v_sum_percent, v_completed, v_watched_minutes
  from lesson_progress lp
  join lessons l on l.id = lp.lesson_id
  join modules m on m.id = l.module_id
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

drop trigger if exists lesson_progress_recalc_enrollment on lesson_progress;
create trigger lesson_progress_recalc_enrollment
after insert or update on lesson_progress
for each row execute function recalc_enrollment_progress();

-- Backfill: aplica la misma fórmula a las matrículas ya existentes para que
-- el progreso quede correcto de inmediato, no sólo en el próximo avance.
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
    where m.course_id = en.course_id and lp.student_id = en.student_id
  ) lp_sum on true
) sub
where e.student_id = sub.student_id and e.course_id = sub.course_id;
