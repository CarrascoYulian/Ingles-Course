-- Transcripción de texto plano por lección — accesibilidad básica (lector
-- de pantalla, buscar dentro del video) sin construir sincronía de
-- subtítulos por timestamp (WebVTT), que es una feature mucho más grande.
-- `null` = el docente todavía no escribió ninguna. RLS existente de
-- `lessons` (0002_rls.sql / 0020_security_and_rls_performance.sql) ya cubre
-- esta columna nueva sin cambios: mismas políticas de select/insert/update.
alter table lessons add column transcript text;
