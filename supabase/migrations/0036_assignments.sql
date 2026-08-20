-- ============================================================================
-- Tareas — el docente sube tareas para que el alumno entregue un archivo o
-- un audio grabado, y luego el docente califica (nota + comentario). No es
-- lo mismo que "Evaluación" (quiz autocalificable, gate de avance): una
-- tarea nunca bloquea el avance de módulo, y la calificación es manual.
--
-- A diferencia del quiz, aquí NO hay riesgo de que el alumno se
-- autocalifique: el peor caso es que mienta sobre qué archivo subió, y ese
-- archivo ya pasó por un ticket de subida firmado server-side
-- (`createUploadTicket`, guard `assignment:submit`). Por eso el alumno SÍ
-- puede insertar/borrar su propia entrega directo vía RLS con la anon key
-- — no hace falta una ruta API con cliente admin como en quiz_attempts.
--
-- Tablas propias, separadas de `lessons`/`quizzes` — "Tareas" es su propia
-- sección de navegación, no un tipo más de bloque de contenido.
-- ============================================================================

create table assignments (
  id           uuid primary key default gen_random_uuid(),
  module_id    uuid not null references modules (id) on delete cascade,
  title        text not null,
  instructions text not null default '',
  media_key    text,
  file_name    text,
  due_at       timestamptz not null,
  created_by   uuid not null references profiles (id),
  created_at   timestamptz not null default now()
);

create index assignments_module_idx on assignments (module_id);

-- Una entrega vigente por alumno — "reemplazar" es borrar la propia fila e
-- insertar de nuevo, nunca un update de contenido (ver políticas abajo).
create table assignment_submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments (id) on delete cascade,
  student_id    uuid not null references profiles (id) on delete cascade,
  kind          text not null check (kind in ('file', 'audio')),
  media_key     text not null,
  file_name     text not null,
  submitted_at  timestamptz not null default now(),
  grade         numeric(5, 2) check (grade between 0 and 100),
  feedback      text,
  graded_at     timestamptz,
  graded_by     uuid references profiles (id),
  unique (assignment_id, student_id)
);

create index assignment_submissions_assignment_idx on assignment_submissions (assignment_id);
create index assignment_submissions_student_idx on assignment_submissions (student_id);

alter table assignments            enable row level security;
alter table assignment_submissions enable row level security;

-- ── Autoría (docente) ────────────────────────────────────────────────────────
create policy "docentes gestionan tareas"
  on assignments for all using (is_staff()) with check (is_staff());

-- ── Lectura del alumno: mismo gate que módulos/lecciones desde
-- 0034_module_access.sql (curso publicado + acceso otorgado al módulo), no
-- sólo matrícula a nivel de curso.
create policy "alumno ve tareas de sus módulos con acceso"
  on assignments for select using (
    is_staff() or exists (
      select 1 from modules m
      join courses c on c.id = m.course_id
      join module_access ma on ma.module_id = m.id
      where m.id = assignments.module_id
        and ma.student_id = (select auth.uid())
        and c.published
    )
  );

-- ── Entregas ─────────────────────────────────────────────────────────────────
-- El docente lee todas (para calificar) y puede actualizar nota/comentario,
-- pero nunca inserta ni borra: no debe poder crear una entrega en nombre de
-- un alumno ni borrar evidencia de una entrega ya hecha.
create policy "docentes ven y califican entregas"
  on assignment_submissions for select using (is_staff());

create policy "docentes califican entregas"
  on assignment_submissions for update using (is_staff()) with check (is_staff());

-- El alumno sólo ve las suyas.
create policy "alumno ve sus propias entregas"
  on assignment_submissions for select using (
    student_id = (select auth.uid())
  );

-- Insertar exige: ser el propio alumno, estar activo, y que la tarea no
-- haya vencido. Se evalúa con `now()` del servidor de Postgres, nunca con
-- el reloj del cliente.
create policy "alumno entrega antes de vencer"
  on assignment_submissions for insert with check (
    student_id = (select auth.uid())
    and is_active_student()
    and exists (
      select 1 from assignments a
      where a.id = assignment_submissions.assignment_id and a.due_at > now()
    )
  );

-- Borrar (para poder resubir) exige lo mismo que insertar, más que todavía
-- no esté calificada — en cuanto el docente califica, o vence la fecha,
-- la entrega queda inmutable, lo que ocurra primero. No hay política de
-- UPDATE de contenido para el alumno: "reemplazar" siempre es borrar +
-- volver a insertar, nunca editar in-place.
create policy "alumno borra su entrega si aún no venció ni se calificó"
  on assignment_submissions for delete using (
    student_id = (select auth.uid())
    and is_active_student()
    and graded_at is null
    and exists (
      select 1 from assignments a
      where a.id = assignment_submissions.assignment_id and a.due_at > now()
    )
  );
