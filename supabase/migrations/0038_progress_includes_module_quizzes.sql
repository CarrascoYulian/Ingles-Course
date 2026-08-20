-- Encontrado probando en vivo el fix de 0037: al agregar la Evaluación como
-- ítem obligatorio del lado del cliente (course-view.tsx), el % de servidor
-- (enrollments.progress) seguía dividiendo sólo entre filas de `lessons` —
-- un módulo con video+PDF+evaluación llegaba a 100 % apenas se veían los 2
-- ítems de `lessons`, sin haber aprobado la evaluación. Eso volvía a abrir
-- el certificado antes de tiempo (mismo síntoma que 0037 arregló para el
-- caso de módulos no otorgados, ahora por el lado de la evaluación).
--
-- Ahora el total de "unidades" del curso es lecciones + evaluaciones (de
-- módulos otorgados), y cada evaluación aprobada suma 100 igual que una
-- lección vista al 100 % — con intentos ilimitados, un solo intento
-- aprobado ya cuenta el ítem como completo, sin importar cuántos falló antes.
create or replace function recalc_enrollment_progress_core(p_student_id uuid, p_course_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_units int;
  v_sum_percent numeric;
  v_completed int;
  v_watched_minutes numeric;
  v_quiz_percent numeric;
begin
  select
    (select count(*) from lessons l
       join modules m on m.id = l.module_id
       join module_access ma on ma.module_id = m.id and ma.student_id = p_student_id
       where m.course_id = p_course_id)
    +
    (select count(*) from quizzes q
       join modules m on m.id = q.module_id
       join module_access ma on ma.module_id = m.id and ma.student_id = p_student_id
       where m.course_id = p_course_id)
  into v_total_units;

  select
    coalesce(sum(lp.watched_percent), 0),
    count(*) filter (where lp.completed_at is not null),
    coalesce(sum(coalesce(l.duration_seconds, l.duration_minutes * 60) * lp.watched_percent / 100.0), 0) / 60.0
  into v_sum_percent, v_completed, v_watched_minutes
  from lesson_progress lp
  join lessons l on l.id = lp.lesson_id
  join modules m on m.id = l.module_id
  join module_access ma on ma.module_id = m.id and ma.student_id = lp.student_id
  where m.course_id = p_course_id and lp.student_id = p_student_id;

  select coalesce(count(distinct q.id), 0) * 100
  into v_quiz_percent
  from quizzes q
  join modules m on m.id = q.module_id
  join module_access ma on ma.module_id = m.id and ma.student_id = p_student_id
  join quiz_attempts qa on qa.quiz_id = q.id and qa.student_id = p_student_id and qa.passed
  where m.course_id = p_course_id;

  update enrollments
  set
    progress = case when v_total_units > 0 then least(100, (v_sum_percent + v_quiz_percent) / v_total_units) else 0 end,
    completed_lessons = v_completed,
    watched_minutes = round(v_watched_minutes)
  where student_id = p_student_id and course_id = p_course_id;
end;
$$;

create or replace function recalc_enrollment_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course_id uuid;
begin
  select c.id into v_course_id
  from lessons l
  join modules m on m.id = l.module_id
  join courses c on c.id = m.course_id
  where l.id = new.lesson_id;

  if v_course_id is null then
    return new;
  end if;

  perform recalc_enrollment_progress_core(new.student_id, v_course_id);
  return new;
end;
$$;

create or replace function recalc_enrollment_progress_on_quiz_attempt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course_id uuid;
begin
  select c.id into v_course_id
  from quizzes q
  join modules m on m.id = q.module_id
  join courses c on c.id = m.course_id
  where q.id = new.quiz_id;

  if v_course_id is null then
    return new;
  end if;

  perform recalc_enrollment_progress_core(new.student_id, v_course_id);
  return new;
end;
$$;

drop trigger if exists quiz_attempts_recalc_enrollment on quiz_attempts;
create trigger quiz_attempts_recalc_enrollment
after insert on quiz_attempts
for each row execute function recalc_enrollment_progress_on_quiz_attempt();

-- Backfill: recalcula todas las matrículas con la fórmula que ya incluye evaluaciones.
do $$
declare
  r record;
begin
  for r in select student_id, course_id from enrollments loop
    perform recalc_enrollment_progress_core(r.student_id, r.course_id);
  end loop;
end;
$$;
