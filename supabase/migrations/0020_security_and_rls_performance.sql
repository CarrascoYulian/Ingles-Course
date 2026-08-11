-- El linter de seguridad de Supabase marcó: funciones sin `search_path` fijo
-- (vulnerables a hijacking vía search_path de sesión), `handle_new_user`
-- invocable directamente por RPC (sólo debería dispararse por trigger), y
-- ~65 políticas RLS ineficientes (auth.uid() re-evaluado fila por fila, y
-- políticas "ALL" duplicando la política de SELECT específica) — exactamente
-- el patrón que hace que Postgres se ponga lento con más usuarios
-- concurrentes. Esta migración corrige ambas categorías sin cambiar quién
-- puede ver o escribir qué: las condiciones de cada política son las mismas,
-- sólo se envuelven y se separan para evaluarse una sola vez por consulta.

-- ── Funciones: fijar search_path ────────────────────────────────────────────
alter function public.is_staff() set search_path = 'public';
alter function public.is_admin() set search_path = 'public';
alter function public.swap_content_block_position(uuid, uuid) set search_path = 'public';
alter function public.swap_course_position(uuid, uuid) set search_path = 'public';
alter function public.next_enrollment_code() set search_path = 'public';

-- `handle_new_user` sólo debe dispararse por el trigger de `auth.users`, no
-- ser invocable por cualquiera vía /rest/v1/rpc/handle_new_user. Los
-- triggers no necesitan privilegio EXECUTE del rol que dispara el evento,
-- así que revocarlo no rompe el alta de usuarios.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ── profiles ─────────────────────────────────────────────────────────────
drop policy if exists "admin gestiona perfiles" on profiles;
drop policy if exists "docentes ven todos los perfiles" on profiles;
drop policy if exists "perfil propio visible" on profiles;
drop policy if exists "perfil propio editable" on profiles;

create policy "admin inserta perfiles" on profiles for insert
  with check (is_admin());
create policy "admin borra perfiles" on profiles for delete
  using (is_admin());
create policy "perfiles visibles" on profiles for select
  using (id = (select auth.uid()) or is_staff());
create policy "perfiles editables" on profiles for update
  using (id = (select auth.uid()) or is_admin())
  with check ((id = (select auth.uid()) and role = auth_role()) or is_admin());

-- ── enrollments ──────────────────────────────────────────────────────────
drop policy if exists "docentes gestionan matrículas" on enrollments;
drop policy if exists "matrícula propia visible" on enrollments;

create policy "docentes insertan matrículas" on enrollments for insert
  with check (is_staff());
create policy "docentes actualizan matrículas" on enrollments for update
  using (is_staff()) with check (is_staff());
create policy "docentes borran matrículas" on enrollments for delete
  using (is_staff());
create policy "matrícula propia visible" on enrollments for select
  using (student_id = (select auth.uid()) or is_staff());

-- ── courses / modules / lessons / content_blocks / course_resources ────────
-- Mismo patrón en las 5: una política "ALL" para staff duplicaba la política
-- de SELECT específica (que ya deja pasar a staff vía `is_staff()` interno).
-- Separar "ALL" en insert/update/delete elimina la política redundante en
-- SELECT sin cambiar quién ve qué.
drop policy if exists "docentes gestionan cursos" on courses;
create policy "docentes insertan cursos" on courses for insert with check (is_staff());
create policy "docentes actualizan cursos" on courses for update using (is_staff()) with check (is_staff());
create policy "docentes borran cursos" on courses for delete using (is_staff());

drop policy if exists "docentes gestionan módulos" on modules;
create policy "docentes insertan módulos" on modules for insert with check (is_staff());
create policy "docentes actualizan módulos" on modules for update using (is_staff()) with check (is_staff());
create policy "docentes borran módulos" on modules for delete using (is_staff());

drop policy if exists "docentes gestionan lecciones" on lessons;
create policy "docentes insertan lecciones" on lessons for insert with check (is_staff());
create policy "docentes actualizan lecciones" on lessons for update using (is_staff()) with check (is_staff());
create policy "docentes borran lecciones" on lessons for delete using (is_staff());

drop policy if exists "docentes gestionan bloques" on content_blocks;
create policy "docentes insertan bloques" on content_blocks for insert with check (is_staff());
create policy "docentes actualizan bloques" on content_blocks for update using (is_staff()) with check (is_staff());
create policy "docentes borran bloques" on content_blocks for delete using (is_staff());

drop policy if exists "docentes gestionan recursos" on course_resources;
create policy "docentes insertan recursos" on course_resources for insert with check (is_staff());
create policy "docentes actualizan recursos" on course_resources for update using (is_staff()) with check (is_staff());
create policy "docentes borran recursos" on course_resources for delete using (is_staff());

-- ── practice_levels / practice_questions ────────────────────────────────────
drop policy if exists "docentes gestionan niveles" on practice_levels;
create policy "docentes insertan niveles" on practice_levels for insert with check (is_staff());
create policy "docentes actualizan niveles" on practice_levels for update using (is_staff()) with check (is_staff());
create policy "docentes borran niveles" on practice_levels for delete using (is_staff());

drop policy if exists "niveles de práctica visibles para autenticados" on practice_levels;
create policy "niveles de práctica visibles para autenticados" on practice_levels for select
  using ((select auth.role()) = 'authenticated');

drop policy if exists "docentes gestionan preguntas de práctica" on practice_questions;
create policy "docentes insertan preguntas" on practice_questions for insert with check (is_staff());
create policy "docentes actualizan preguntas" on practice_questions for update using (is_staff()) with check (is_staff());
create policy "docentes borran preguntas" on practice_questions for delete using (is_staff());

drop policy if exists "preguntas de práctica visibles para autenticados" on practice_questions;
create policy "preguntas de práctica visibles para autenticados" on practice_questions for select
  using ((select auth.role()) = 'authenticated');

-- ── Tablas con auth.uid() sin envolver (sin políticas ALL duplicadas) ───────
drop policy if exists "progreso propio visible" on lesson_progress;
create policy "progreso propio visible" on lesson_progress for select
  using (student_id = (select auth.uid()) or is_staff());

drop policy if exists "progreso propio editable" on lesson_progress;
create policy "progreso propio editable" on lesson_progress for insert
  with check (student_id = (select auth.uid()));

drop policy if exists "progreso propio actualizable" on lesson_progress;
create policy "progreso propio actualizable" on lesson_progress for update
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

drop policy if exists "insignias propias visibles" on student_badges;
create policy "insignias propias visibles" on student_badges for select
  using (student_id = (select auth.uid()) or is_staff());

drop policy if exists "el estudiante ve sus mensajes" on messages;
create policy "el estudiante ve sus mensajes" on messages for select
  using (student_id = (select auth.uid()) or is_staff());

drop policy if exists "docentes envían mensajes" on messages;
create policy "docentes envían mensajes" on messages for insert
  with check (is_staff() and sender_id = (select auth.uid()));

drop policy if exists "el estudiante marca sus mensajes como leídos" on messages;
create policy "el estudiante marca sus mensajes como leídos" on messages for update
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

drop policy if exists "práctica propia visible" on practice_progress;
create policy "práctica propia visible" on practice_progress for select
  using ((student_id = (select auth.uid()) and is_active_student()) or is_staff());

drop policy if exists "práctica propia insertable" on practice_progress;
create policy "práctica propia insertable" on practice_progress for insert
  with check (student_id = (select auth.uid()) and is_active_student());

drop policy if exists "práctica propia actualizable" on practice_progress;
create policy "práctica propia actualizable" on practice_progress for update
  using (student_id = (select auth.uid()) and is_active_student())
  with check (student_id = (select auth.uid()) and is_active_student());

drop policy if exists "progreso diario propio visible" on practice_daily_progress;
create policy "progreso diario propio visible" on practice_daily_progress for select
  using ((student_id = (select auth.uid()) and is_active_student()) or is_staff());

drop policy if exists "progreso diario propio insertable" on practice_daily_progress;
create policy "progreso diario propio insertable" on practice_daily_progress for insert
  with check (student_id = (select auth.uid()) and is_active_student());

drop policy if exists "progreso diario propio actualizable" on practice_daily_progress;
create policy "progreso diario propio actualizable" on practice_daily_progress for update
  using (student_id = (select auth.uid()) and is_active_student())
  with check (student_id = (select auth.uid()) and is_active_student());

-- ── Índices faltantes en llaves foráneas ────────────────────────────────────
create index if not exists courses_created_by_idx on courses (created_by);
create index if not exists lesson_progress_lesson_id_idx on lesson_progress (lesson_id);
create index if not exists messages_sender_id_idx on messages (sender_id);
create index if not exists modules_requires_module_id_idx on modules (requires_module_id);
create index if not exists student_badges_badge_id_idx on student_badges (badge_id);

-- Constraint única duplicada (mismo par de columnas, dos nombres).
alter table lessons drop constraint if exists lessons_module_position_unique;
