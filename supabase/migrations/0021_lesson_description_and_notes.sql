-- La pestaña "Descripción" de la lección mostraba siempre el mismo texto
-- fijo sobre Present Perfect, sin importar la lección real — `lessons` no
-- tenía ninguna columna donde el docente pudiera escribir una. Igual con
-- "Mis notas": el botón "Añadir nota" fingía guardar algo en el minuto
-- actual del video pero no existía ninguna tabla detrás.

alter table lessons add column description text;

create table lesson_notes (
  id               uuid primary key default gen_random_uuid(),
  lesson_id        uuid not null references lessons (id) on delete cascade,
  student_id       uuid not null references profiles (id) on delete cascade,
  body             text not null,
  timestamp_seconds integer not null check (timestamp_seconds >= 0),
  created_at       timestamptz not null default now()
);

create index lesson_notes_lookup_idx on lesson_notes (lesson_id, student_id, timestamp_seconds);

alter table lesson_notes enable row level security;

create policy "notas propias visibles"
  on lesson_notes for select
  using (student_id = (select auth.uid()));

create policy "notas propias insertables"
  on lesson_notes for insert
  with check (student_id = (select auth.uid()));

create policy "notas propias borrables"
  on lesson_notes for delete
  using (student_id = (select auth.uid()));
