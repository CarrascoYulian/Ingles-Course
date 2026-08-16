-- ============================================================================
-- Foro de curso + calificaciones — dos gaps del informe de auditoría
-- (16 ago 2026), con alcance confirmado por el cliente:
--
--   - Foro: espacio NUEVO a nivel de CURSO, separado de los comentarios por
--     lección que ya existen (`lesson_comments`) — esos son por video
--     concreto; esto es para preguntas generales del curso.
--   - Calificaciones: SÓLO el docente las ve. No hay catálogo público, así
--     que no sirven para "vender" el curso — son feedback interno. Un
--     alumno puede ver/editar la SUYA, nunca las de otros compañeros.
-- ============================================================================

create table course_threads (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references courses (id) on delete cascade,
  author_id  uuid not null references profiles (id) on delete cascade,
  title      text not null,
  body       text not null,
  created_at timestamptz not null default now()
);

create index course_threads_course_idx on course_threads (course_id, created_at desc);

create table course_thread_replies (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references course_threads (id) on delete cascade,
  author_id  uuid not null references profiles (id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create index course_thread_replies_thread_idx on course_thread_replies (thread_id, created_at);

-- Una calificación por alumno por curso — calificar de nuevo actualiza la
-- misma fila (`updated_at`), no crea un historial de calificaciones viejas.
create table course_ratings (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references courses (id) on delete cascade,
  student_id uuid not null references profiles (id) on delete cascade,
  stars      smallint not null check (stars between 1 and 5),
  review     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (course_id, student_id)
);

alter table course_threads        enable row level security;
alter table course_thread_replies enable row level security;
alter table course_ratings        enable row level security;

-- ── Foro: mismo patrón que lesson_comments (0024/0027) — visible para
-- matriculados en un curso publicado, cualquiera borra lo propio, el
-- docente borra cualquier cosa (moderación).
create policy "docentes ven cualquier hilo"
  on course_threads for select using (is_staff());

create policy "alumnos ven hilos de sus cursos"
  on course_threads for select using (
    exists (
      select 1 from courses c
      join enrollments e on e.course_id = c.id
      where c.id = course_threads.course_id
        and e.student_id = (select auth.uid())
        and c.published
    )
  );

create policy "docentes abren hilos"
  on course_threads for insert
  with check (is_staff() and author_id = (select auth.uid()));

create policy "alumnos abren hilos en sus cursos"
  on course_threads for insert
  with check (
    is_active_student()
    and author_id = (select auth.uid())
    and exists (
      select 1 from courses c
      join enrollments e on e.course_id = c.id
      where c.id = course_threads.course_id
        and e.student_id = (select auth.uid())
        and c.published
    )
  );

create policy "docentes borran cualquier hilo"
  on course_threads for delete using (is_staff());

create policy "alumnos borran su propio hilo"
  on course_threads for delete using (
    is_active_student() and author_id = (select auth.uid())
  );

-- ── Respuestas del foro: mismo criterio, a través del hilo.
create policy "docentes ven cualquier respuesta"
  on course_thread_replies for select using (is_staff());

create policy "alumnos ven respuestas de hilos de sus cursos"
  on course_thread_replies for select using (
    exists (
      select 1 from course_threads t
      join courses c on c.id = t.course_id
      join enrollments e on e.course_id = c.id
      where t.id = course_thread_replies.thread_id
        and e.student_id = (select auth.uid())
        and c.published
    )
  );

create policy "docentes responden"
  on course_thread_replies for insert
  with check (is_staff() and author_id = (select auth.uid()));

create policy "alumnos responden en hilos de sus cursos"
  on course_thread_replies for insert
  with check (
    is_active_student()
    and author_id = (select auth.uid())
    and exists (
      select 1 from course_threads t
      join courses c on c.id = t.course_id
      join enrollments e on e.course_id = c.id
      where t.id = course_thread_replies.thread_id
        and e.student_id = (select auth.uid())
        and c.published
    )
  );

create policy "docentes borran cualquier respuesta"
  on course_thread_replies for delete using (is_staff());

create policy "alumnos borran su propia respuesta"
  on course_thread_replies for delete using (
    is_active_student() and author_id = (select auth.uid())
  );

-- ── Calificaciones: el docente ve todas (feedback interno); el alumno sólo
-- la suya, para poder verla/editarla — nunca las de sus compañeros.
create policy "docentes ven todas las calificaciones"
  on course_ratings for select using (is_staff());

create policy "alumno ve su propia calificación"
  on course_ratings for select using (
    student_id = (select auth.uid())
  );

create policy "alumno califica cursos en los que está matriculado"
  on course_ratings for insert
  with check (
    is_active_student()
    and student_id = (select auth.uid())
    and exists (
      select 1 from enrollments e
      where e.course_id = course_ratings.course_id
        and e.student_id = (select auth.uid())
    )
  );

create policy "alumno edita su propia calificación"
  on course_ratings for update
  using (is_active_student() and student_id = (select auth.uid()))
  with check (is_active_student() and student_id = (select auth.uid()));
