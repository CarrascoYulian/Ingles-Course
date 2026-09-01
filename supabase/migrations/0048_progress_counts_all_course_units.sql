-- 0037/0038 hicieron que enrollments.progress dividiera sólo entre las
-- unidades (lecciones + evaluaciones) con module_access otorgado al alumno,
-- para que coincidiera con lo que el cliente ya veía filtrado por RLS.
--
-- Eso abrió un hueco distinto: si el docente agrega unidades nuevas a un
-- curso (nivel) DESPUÉS de matricular/otorgar acceso, o si nunca amplía el
-- acceso a las últimas unidades, el alumno llega a 100 % — y se le habilita
-- el certificado de finalización del nivel — habiendo cursado sólo las
-- unidades que sí tenía otorgadas, no todas las del curso real. El
-- certificado es "completó el nivel A1 entero", no "completó lo que se le
-- otorgó hasta ahora".
--
-- El denominador vuelve a ser TODAS las unidades del curso (como en
-- 0024), sin filtrar por module_access — el numerador (lo realmente visto/
-- aprobado) sigue viniendo de lesson_progress/quiz_attempts, que sólo
-- existen para unidades a las que el alumno tuvo acceso real. Una unidad
-- sin otorgar simplemente no suma nada, así que el progreso no puede
-- llegar a 100 mientras falte otorgarla y completarla.
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
    (select count(*) from lessons l join modules m on m.id = l.module_id where m.course_id = p_course_id)
    +
    (select count(*) from quizzes q join modules m on m.id = q.module_id where m.course_id = p_course_id)
  into v_total_units;

  select
    coalesce(sum(lp.watched_percent), 0),
    count(*) filter (where lp.completed_at is not null),
    coalesce(sum(coalesce(l.duration_seconds, l.duration_minutes * 60) * lp.watched_percent / 100.0), 0) / 60.0
  into v_sum_percent, v_completed, v_watched_minutes
  from lesson_progress lp
  join lessons l on l.id = lp.lesson_id
  join modules m on m.id = l.module_id
  where m.course_id = p_course_id and lp.student_id = p_student_id;

  select coalesce(count(distinct q.id), 0) * 100
  into v_quiz_percent
  from quizzes q
  join modules m on m.id = q.module_id
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

-- Backfill: recalcula todas las matrículas con la fórmula que cuenta el curso completo.
do $$
declare
  r record;
begin
  for r in select student_id, course_id from enrollments loop
    perform recalc_enrollment_progress_core(r.student_id, r.course_id);
  end loop;
end;
$$;
