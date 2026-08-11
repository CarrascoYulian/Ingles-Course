-- El reproductor de video del alumno era simulado: un `setInterval` subía
-- el porcentaje "visto" sin que existiera ningún archivo de video real
-- detrás. `lessons` no tenía ninguna columna que apuntara a un objeto de
-- Storage — el video "real" vivía sólo en `content_blocks`, sin relación
-- con la lección que el alumno realmente ve. Esta columna permite adjuntar
-- el archivo real de cada lección.
alter table lessons
  add column media_key text;
