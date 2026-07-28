-- ============================================================================
-- Row Level Security
--
-- La autorización vive en la base de datos, no en la interfaz. El cliente
-- consulta directamente con la anon key: si las políticas fallan, ocultar un
-- botón no protege nada.
-- ============================================================================

alter table profiles          enable row level security;
alter table courses           enable row level security;
alter table modules           enable row level security;
alter table content_blocks    enable row level security;
alter table lessons           enable row level security;
alter table enrollments       enable row level security;
alter table lesson_progress   enable row level security;
alter table badges            enable row level security;
alter table student_badges    enable row level security;
alter table practice_progress enable row level security;

-- ── Helpers ─────────────────────────────────────────────────────────────────
-- SECURITY DEFINER evita la recursión infinita: una política sobre `profiles`
-- que consultase `profiles` volvería a evaluarse a sí misma.
create or replace function auth_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_staff()
returns boolean
language sql
stable
as $$
  select auth_role() in ('admin', 'instructor');
$$;

create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select auth_role() = 'admin';
$$;

-- ── profiles ────────────────────────────────────────────────────────────────
create policy "perfil propio visible"
  on profiles for select using (id = auth.uid());

create policy "docentes ven todos los perfiles"
  on profiles for select using (is_staff());

create policy "perfil propio editable"
  on profiles for update using (id = auth.uid())
  -- Un estudiante no puede ascenderse a administrador.
  with check (id = auth.uid() and role = auth_role());

create policy "admin gestiona perfiles"
  on profiles for all using (is_admin()) with check (is_admin());

-- ── courses / modules / content_blocks / lessons ────────────────────────────
-- Los estudiantes sólo ven lo publicado; el personal docente ve también los
-- borradores.
create policy "cursos publicados visibles"
  on courses for select using (published or is_staff());

create policy "docentes gestionan cursos"
  on courses for all using (is_staff()) with check (is_staff());

create policy "módulos de cursos visibles"
  on modules for select using (
    exists (select 1 from courses c where c.id = course_id and (c.published or is_staff()))
  );

create policy "docentes gestionan módulos"
  on modules for all using (is_staff()) with check (is_staff());

create policy "bloques de módulos visibles"
  on content_blocks for select using (
    exists (
      select 1 from modules m join courses c on c.id = m.course_id
      where m.id = module_id and (c.published or is_staff())
    )
  );

create policy "docentes gestionan bloques"
  on content_blocks for all using (is_staff()) with check (is_staff());

create policy "lecciones de módulos visibles"
  on lessons for select using (
    exists (
      select 1 from modules m join courses c on c.id = m.course_id
      where m.id = module_id and (c.published or is_staff())
    )
  );

create policy "docentes gestionan lecciones"
  on lessons for all using (is_staff()) with check (is_staff());

-- ── enrollments ─────────────────────────────────────────────────────────────
create policy "matrícula propia visible"
  on enrollments for select using (student_id = auth.uid() or is_staff());

create policy "docentes gestionan matrículas"
  on enrollments for all using (is_staff()) with check (is_staff());

-- ── lesson_progress ─────────────────────────────────────────────────────────
create policy "progreso propio visible"
  on lesson_progress for select using (student_id = auth.uid() or is_staff());

create policy "progreso propio editable"
  on lesson_progress for insert with check (student_id = auth.uid());

create policy "progreso propio actualizable"
  on lesson_progress for update using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- Reiniciar el progreso es exclusivo de administración.
create policy "admin reinicia progreso"
  on lesson_progress for delete using (is_admin());

-- ── Gamificación ────────────────────────────────────────────────────────────
create policy "insignias visibles" on badges for select using (true);

create policy "insignias propias visibles"
  on student_badges for select using (student_id = auth.uid() or is_staff());

create policy "práctica propia visible"
  on practice_progress for select using (student_id = auth.uid() or is_staff());

-- La XP la acredita el servidor con service role: si el estudiante pudiera
-- escribir esta fila desde el navegador, podría regalarse puntos.
create policy "práctica propia insertable"
  on practice_progress for insert with check (student_id = auth.uid());
