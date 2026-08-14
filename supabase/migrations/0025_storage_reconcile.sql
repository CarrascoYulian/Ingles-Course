-- Fase 2 (issue #38) — registro de auditoría del job semanal de
-- reconciliación de Storage. El job corre con service role (salta RLS), así
-- que las políticas de aquí sólo importan para que el panel admin pueda
-- LEER el historial si algún día se muestra en la UI.

create table if not exists storage_reconcile_runs (
  id            uuid primary key default gen_random_uuid(),
  ran_at        timestamptz not null default now(),
  scanned_count int not null,
  deleted_count int not null,
  deleted_keys  jsonb not null default '[]'::jsonb,
  error         text
);

alter table storage_reconcile_runs enable row level security;

create policy "docentes ven el historial de reconciliación"
  on storage_reconcile_runs for select using (is_staff());
