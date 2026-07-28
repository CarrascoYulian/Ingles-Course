-- ============================================================================
-- Mensajería docente → estudiante
--
-- Antes, "Enviar mensaje" no persistía nada: el endpoint devolvía `ok: true`
-- sin guardar el mensaje en ningún sitio. Esta tabla lo hace real.
-- ============================================================================

create table messages (
  id         uuid primary key default gen_random_uuid(),
  sender_id  uuid not null references profiles (id) on delete cascade,
  student_id uuid not null references profiles (id) on delete cascade,
  body       text not null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index messages_student_idx on messages (student_id, created_at desc);

alter table messages enable row level security;

create policy "el estudiante ve sus mensajes"
  on messages for select using (student_id = auth.uid() or is_staff());

create policy "docentes envían mensajes"
  on messages for insert with check (is_staff() and sender_id = auth.uid());

create policy "el estudiante marca sus mensajes como leídos"
  on messages for update using (student_id = auth.uid())
  with check (student_id = auth.uid());
