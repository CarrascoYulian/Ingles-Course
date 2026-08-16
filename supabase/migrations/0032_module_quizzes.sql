-- ============================================================================
-- Evaluación real por módulo — antes "Evaluación" sólo existía como badge de
-- tipo de bloque en el constructor de contenido (BLOCK_TYPES en
-- src/types/domain.ts), sin ninguna pregunta ni calificación real detrás.
--
-- Reglas de negocio confirmadas por el cliente (16 ago 2026):
--   - Reprobar bloquea avanzar al siguiente módulo (es un gate real).
--   - Intentos ilimitados.
--   - Sólo opción múltiple en esta primera versión (autocalificable, sin
--     revisión manual del docente).
--
-- Un solo quiz por módulo (unique module_id). `quiz_questions`/`quiz_options`
-- incluyen la respuesta correcta — un alumno NUNCA debe poder leerlas
-- directamente vía RLS + anon key, o vería la clave de respuestas en el
-- Network tab. Por eso NO hay política de select para 'student' en esas dos
-- tablas: el lado alumno se sirve exclusivamente vía rutas API
-- (`/api/quizzes/[moduleId]/take` y `/attempt`) con el cliente admin de
-- Supabase, que arma la versión sin `is_correct` y califica en el server.
-- ============================================================================

create table quizzes (
  id            uuid primary key default gen_random_uuid(),
  module_id     uuid not null unique references modules (id) on delete cascade,
  passing_score numeric(5,2) not null default 70 check (passing_score between 0 and 100),
  created_at    timestamptz not null default now()
);

create table quiz_questions (
  id       uuid primary key default gen_random_uuid(),
  quiz_id  uuid not null references quizzes (id) on delete cascade,
  prompt   text not null,
  position integer not null default 0
);

create index quiz_questions_quiz_idx on quiz_questions (quiz_id, position);

create table quiz_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references quiz_questions (id) on delete cascade,
  label       text not null,
  is_correct  boolean not null default false,
  position    integer not null default 0
);

create index quiz_options_question_idx on quiz_options (question_id, position);

-- Cada intento queda guardado (no se sobrescribe) — con intentos ilimitados,
-- el historial es lo que le permite al docente ver cuántas veces le costó a
-- un alumno. `score`/`passed` sí son seguros de leer para el propio alumno:
-- no revelan qué opción era la correcta, sólo el resultado ya calculado.
create table quiz_attempts (
  id         uuid primary key default gen_random_uuid(),
  quiz_id    uuid not null references quizzes (id) on delete cascade,
  student_id uuid not null references profiles (id) on delete cascade,
  score      numeric(5,2) not null check (score between 0 and 100),
  passed     boolean not null,
  created_at timestamptz not null default now()
);

create index quiz_attempts_quiz_student_idx on quiz_attempts (quiz_id, student_id);

alter table quizzes        enable row level security;
alter table quiz_questions enable row level security;
alter table quiz_options   enable row level security;
alter table quiz_attempts  enable row level security;

-- ── Autoría (docente) ────────────────────────────────────────────────────────
create policy "docentes gestionan quizzes"
  on quizzes for all using (is_staff()) with check (is_staff());

create policy "docentes gestionan preguntas"
  on quiz_questions for all using (is_staff()) with check (is_staff());

create policy "docentes gestionan opciones"
  on quiz_options for all using (is_staff()) with check (is_staff());

-- ── Lectura del alumno: sólo METADATA del quiz (id, passing_score) del
-- módulo de un curso en el que está matriculado — nunca las opciones.
create policy "alumno ve si su módulo tiene quiz"
  on quizzes for select using (
    is_staff() or exists (
      select 1 from modules m
      join courses c on c.id = m.course_id
      join enrollments e on e.course_id = c.id
      where m.id = quizzes.module_id
        and e.student_id = (select auth.uid())
        and c.published
    )
  );

-- El enunciado de la pregunta (sin opciones) no es sensible — se necesita
-- para poder contar cuántas preguntas tiene el quiz sin pasar por una ruta
-- API sólo para eso. La clave de respuestas sigue exclusivamente en
-- `quiz_options`, que NO tiene política de select para alumnos.
create policy "alumno ve el enunciado, no las opciones"
  on quiz_questions for select using (
    is_staff() or exists (
      select 1 from quizzes q
      join modules m on m.id = q.module_id
      join courses c on c.id = m.course_id
      join enrollments e on e.course_id = c.id
      where q.id = quiz_questions.quiz_id
        and e.student_id = (select auth.uid())
        and c.published
    )
  );

-- ── Intentos: el alumno sólo puede LEER los suyos — nunca insertar
-- directamente. Si el INSERT se permitiera vía RLS con la anon key, un
-- alumno podría mandar `{ passed: true }` a mano y saltarse el quiz entero;
-- por eso el único INSERT válido pasa por `/api/quizzes/[moduleId]/attempt`,
-- que califica en el servidor y escribe con el cliente admin (sin RLS). El
-- docente lee todos los intentos (reportería), tampoco los edita a mano.
create policy "alumno ve sus propios intentos"
  on quiz_attempts for select using (
    is_staff() or student_id = (select auth.uid())
  );
