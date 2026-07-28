-- ============================================================================
-- Recursos de curso, catálogo de niveles de práctica y bitácora de actividad
--
-- Antes, /api/resources, /api/badges, /api/practice/levels y todo
-- /api/analytics/* devolvían SIEMPRE los mismos datos de ejemplo, incluso
-- con Supabase completamente configurado — no existían las tablas para
-- responder con nada real. Esta migración las añade.
-- ============================================================================

-- ── Recursos descargables del curso ──────────────────────────────────────
create table course_resources (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references courses (id) on delete cascade,
  type       text not null check (type in ('PDF', 'MP3', 'DOC')),
  title      text not null,
  meta       text not null default '',
  media_key  text,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

create index course_resources_course_idx on course_resources (course_id, position);

alter table course_resources enable row level security;

create policy "recursos de cursos publicados visibles"
  on course_resources for select using (
    exists (select 1 from courses c where c.id = course_id and (c.published or is_staff()))
  );

create policy "docentes gestionan recursos"
  on course_resources for all using (is_staff()) with check (is_staff());

-- ── Catálogo de niveles de práctica gamificada ───────────────────────────
create table practice_levels (
  id          uuid primary key default gen_random_uuid(),
  position    integer not null unique,
  title       text not null,
  xp_reward   integer not null default 0,
  total_steps integer not null default 10
);

alter table practice_levels enable row level security;

create policy "niveles de práctica visibles para autenticados"
  on practice_levels for select using (auth.role() = 'authenticated');

create policy "docentes gestionan niveles"
  on practice_levels for all using (is_staff()) with check (is_staff());

insert into practice_levels (position, title, xp_reward, total_steps) values
  (1, 'Nivel 1 · Saludos', 240, 10),
  (2, 'Nivel 2 · Rutinas', 310, 10),
  (3, 'Nivel 3 · Pasado simple', 0, 10),
  (4, 'Nivel 4 · Futuro', 0, 10),
  (5, 'Nivel 5 · Condicionales', 0, 10)
on conflict (position) do nothing;

-- ── Bitácora de actividad reciente (panel docente) ───────────────────────
create table activity_log (
  id         uuid primary key default gen_random_uuid(),
  tone       text not null check (tone in ('success', 'info', 'warning', 'danger')),
  -- Segmentos [{text, strong?}] — permite negritas parciales en el mensaje,
  -- igual que en el diseño ("María completó **Módulo 4**").
  segments   jsonb not null,
  created_at timestamptz not null default now()
);

create index activity_log_created_at_idx on activity_log (created_at desc);

alter table activity_log enable row level security;

create policy "docentes ven la actividad"
  on activity_log for select using (is_staff());

create policy "sistema inserta actividad"
  on activity_log for insert with check (is_staff());
