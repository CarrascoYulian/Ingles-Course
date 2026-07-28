-- ============================================================================
-- Supabase Storage — bucket privado para archivos de contenido
--
-- Un solo bucket, `course-files`, con la misma jerarquía de rutas que usaba
-- el diseño original para Cloudflare R2 (cursos/<id>/modulos/<id>/<uuid>-…).
-- Postgres guarda sólo la ruta (`content_blocks.media_key`); el binario y su
-- existencia real viven exclusivamente en Storage.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('course-files', 'course-files', false, 2147483648) -- 2 GB, igual que el límite de la UI
on conflict (id) do nothing;

-- ── Políticas de storage.objects ────────────────────────────────────────────
-- Lectura: cualquier usuario autenticado (estudiante o docente). Escritura:
-- sólo personal docente. Reutiliza `is_staff()` de 0002_rls.sql — misma
-- fuente de verdad que ya protege `content_blocks`.

create policy "lectura de archivos para autenticados"
  on storage.objects for select
  using (bucket_id = 'course-files' and auth.role() = 'authenticated');

create policy "docentes suben archivos"
  on storage.objects for insert
  with check (bucket_id = 'course-files' and is_staff());

create policy "docentes actualizan archivos"
  on storage.objects for update
  using (bucket_id = 'course-files' and is_staff());

create policy "docentes eliminan archivos"
  on storage.objects for delete
  using (bucket_id = 'course-files' and is_staff());
