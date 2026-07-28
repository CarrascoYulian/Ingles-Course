-- ============================================================================
-- Metadatos de subida en content_blocks
--
-- El flujo de "gestión de archivos" necesita registrar quién subió cada
-- archivo y cuándo, no sólo su ruta. Sin esto no hay forma de auditar quién
-- publicó qué contenido.
-- ============================================================================

alter table content_blocks
  add column if not exists uploaded_by uuid references profiles (id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

create index if not exists content_blocks_uploaded_by_idx on content_blocks (uploaded_by);
