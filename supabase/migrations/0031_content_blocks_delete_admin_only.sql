-- ============================================================================
-- Borrar un bloque de contenido pasa a ser exclusivo de admin.
--
-- La política "docentes gestionan bloques" (0002_rls.sql) cubría insert /
-- update / delete con el mismo `is_staff()` — cualquier instructor que podía
-- editar un bloque también podía borrarlo, sin distinción. content:edit
-- sigue siendo de instructor+admin (crear/editar contenido es parte normal
-- de dar clase); content:delete pasa a ser sólo de admin, igual que ya lo es
-- reiniciar el progreso de un alumno ("admin reinicia progreso", 0002_rls.sql).
-- ============================================================================

drop policy "docentes gestionan bloques" on content_blocks;

create policy "docentes crean bloques"
  on content_blocks for insert with check (is_staff());

create policy "docentes actualizan bloques"
  on content_blocks for update using (is_staff()) with check (is_staff());

create policy "admin borra bloques"
  on content_blocks for delete using (is_admin());
