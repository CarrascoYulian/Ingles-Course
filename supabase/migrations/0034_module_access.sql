-- ============================================================================
-- Acceso a módulos por alumno
--
-- Hasta ahora la matrícula era todo-o-nada a nivel de curso: un alumno
-- matriculado veía TODOS los módulos publicados de ese curso. Esta migración
-- agrega un otorgamiento explícito por módulo — el docente decide a qué
-- módulos concretos tiene acceso cada alumno, y puede ampliarlo después sin
-- volver a matricular.
-- ============================================================================

create table module_access (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  module_id uuid not null references modules(id) on delete cascade,
  granted_by uuid references profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  unique (student_id, module_id)
);

alter table module_access enable row level security;

create policy "acceso propio visible"
  on module_access for select using (student_id = auth.uid() or is_staff());

create policy "docentes gestionan acceso"
  on module_access for all using (is_staff()) with check (is_staff());

-- Backfill: todo alumno ya matriculado conservaba acceso a todos los módulos
-- de su curso hasta este momento — sin esto, al activar el RLS de abajo
-- cualquier matrícula existente se quedaría sin poder ver nada.
insert into module_access (student_id, module_id)
select e.student_id, m.id
from enrollments e
join modules m on m.course_id = e.course_id
on conflict do nothing;

-- ── RLS de modules/lessons: ahora exige acceso otorgado, no sólo curso
-- publicado ────────────────────────────────────────────────────────────────
drop policy if exists "módulos de cursos visibles" on modules;
create policy "módulos de cursos visibles"
  on modules for select using (
    is_staff() or (
      exists (select 1 from courses c where c.id = course_id and c.published)
      and exists (
        select 1 from module_access ma
        where ma.module_id = modules.id and ma.student_id = auth.uid()
      )
    )
  );

drop policy if exists "lecciones de módulos visibles" on lessons;
create policy "lecciones de módulos visibles"
  on lessons for select using (
    is_staff() or exists (
      select 1 from modules m join courses c on c.id = m.course_id
      where m.id = module_id and c.published
      and exists (
        select 1 from module_access ma
        where ma.module_id = m.id and ma.student_id = auth.uid()
      )
    )
  );
