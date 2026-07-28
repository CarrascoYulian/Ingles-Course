-- ============================================================================
-- Inglés con Método · esquema base
--
-- Principio rector: la base de datos guarda SÓLO metadatos del curso y la
-- RUTA del objeto en Supabase Storage (`media_key`, bucket `course-files`,
-- creado en 0003_storage.sql). Ningún binario ni ninguna URL firmada se
-- persiste: las URLs caducan y una URL guardada acaba siendo un enlace roto
-- o un acceso permanente no revocable.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── Enumeraciones ───────────────────────────────────────────────────────────
create type user_role  as enum ('admin', 'instructor', 'student');
create type cefr_level as enum ('A1', 'A2', 'B1', 'B2', 'C1');
create type block_type as enum ('Video', 'PDF', 'Ejercicio', 'Audio', 'Evaluación');

-- ── Perfiles ────────────────────────────────────────────────────────────────
-- Extiende auth.users. El rol vive aquí (no en el JWT) para poder revocarlo
-- sin esperar a que caduque el token.
create table profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  role            user_role   not null default 'student',
  full_name       text        not null,
  enrollment_code text        unique,
  level           cefr_level,
  avatar_color    text,
  is_active       boolean     not null default true,
  created_at      timestamptz not null default now()
);

create index profiles_role_idx  on profiles (role);
create index profiles_level_idx on profiles (level) where role = 'student';

-- Búsqueda por nombre o matrícula del panel docente.
create index profiles_search_idx on profiles
  using gin (to_tsvector('spanish', full_name || ' ' || coalesce(enrollment_code, '')));

-- ── Cursos ──────────────────────────────────────────────────────────────────
create table courses (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null,
  level      cefr_level  not null,
  published  boolean     not null default false,
  position   integer     not null default 0,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index courses_published_idx on courses (published, position);

-- ── Módulos ─────────────────────────────────────────────────────────────────
create table modules (
  id                 uuid primary key default gen_random_uuid(),
  course_id          uuid    not null references courses (id) on delete cascade,
  title              text    not null,
  position           integer not null default 0,
  -- Prerrequisito: el módulo N+1 se abre al completar el N.
  requires_module_id uuid references modules (id) on delete set null,

  unique (course_id, position) deferrable initially deferred
);

create index modules_course_idx on modules (course_id, position);

-- ── Bloques de contenido ────────────────────────────────────────────────────
create table content_blocks (
  id        uuid primary key default gen_random_uuid(),
  module_id uuid       not null references modules (id) on delete cascade,
  type      block_type not null,
  title     text       not null,
  meta      text       not null default '',
  position  integer    not null default 0,
  -- Ruta del objeto en Storage, p. ej. cursos/<id>/modulos/<id>/<uuid>-video.mp4
  media_key text,

  unique (module_id, position) deferrable initially deferred
);

create index content_blocks_module_idx on content_blocks (module_id, position);

-- ── Lecciones ───────────────────────────────────────────────────────────────
create table lessons (
  id               uuid primary key default gen_random_uuid(),
  module_id        uuid    not null references modules (id) on delete cascade,
  position         integer not null,
  title            text    not null,
  duration_minutes integer not null default 0,
  media_key        text,

  unique (module_id, position) deferrable initially deferred
);

create index lessons_module_idx on lessons (module_id, position);

-- ── Matrículas ──────────────────────────────────────────────────────────────
create table enrollments (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid    not null references profiles (id) on delete cascade,
  course_id         uuid    not null references courses  (id) on delete cascade,
  progress          numeric(5,2) not null default 0 check (progress between 0 and 100),
  watched_minutes   integer not null default 0,
  completed_lessons integer not null default 0,
  created_at        timestamptz not null default now(),

  unique (student_id, course_id)
);

create index enrollments_course_idx  on enrollments (course_id);
create index enrollments_student_idx on enrollments (student_id);

-- ── Progreso por lección ────────────────────────────────────────────────────
create table lesson_progress (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references profiles (id) on delete cascade,
  lesson_id       uuid not null references lessons  (id) on delete cascade,
  watched_percent numeric(5,2) not null default 0 check (watched_percent between 0 and 100),
  completed_at    timestamptz,

  -- Clave del upsert que usa el reproductor.
  unique (student_id, lesson_id)
);

create index lesson_progress_student_idx on lesson_progress (student_id);

-- ── Gamificación ────────────────────────────────────────────────────────────
create table badges (
  id          uuid primary key default gen_random_uuid(),
  name        text    not null unique,
  requirement text    not null,
  position    integer not null default 0
);

create table student_badges (
  student_id uuid        not null references profiles (id) on delete cascade,
  badge_id   uuid        not null references badges   (id) on delete cascade,
  earned_at  timestamptz not null default now(),

  primary key (student_id, badge_id)
);

create table practice_progress (
  student_id    uuid primary key references profiles (id) on delete cascade,
  xp            integer not null default 0 check (xp >= 0),
  coins         integer not null default 0 check (coins >= 0),
  streak_days   integer not null default 0 check (streak_days >= 0),
  current_level integer not null default 1,
  current_step  integer not null default 1,
  updated_at    timestamptz not null default now()
);

-- ── Alta automática de perfil ───────────────────────────────────────────────
-- Sin esto, un usuario recién registrado quedaría sin fila en `profiles` y
-- todas las políticas RLS lo tratarían como anónimo.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, role, full_name, enrollment_code, level)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'student'),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'enrollment_code',
    'A1'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
