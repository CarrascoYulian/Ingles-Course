-- Marca de "hasta acá vi los comentarios de esta lección", por usuario.
-- Sin esto no hay forma de saber si un comentario es "nuevo" para alguien
-- en particular — a diferencia de `messages` (1 a 1 alumno-docente),
-- `lesson_comments` es un hilo que puede ver más de una persona, así que
-- no alcanza con un solo `read_at` en la fila del comentario.

create table lesson_comment_reads (
  user_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table lesson_comment_reads enable row level security;

create policy "cada quien ve y actualiza su propio marcador"
on lesson_comment_reads for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
