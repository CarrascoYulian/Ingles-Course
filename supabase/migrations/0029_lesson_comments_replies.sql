-- Respuestas a comentarios: alumno y docente necesitan poder responder un
-- comentario concreto, no sólo publicar comentarios sueltos. `parent_id`
-- nulo = comentario de primer nivel; con valor = respuesta a ese comentario
-- (un solo nivel de anidamiento, sin respuestas a respuestas). Las
-- políticas de select/insert/delete ya existentes no distinguen por
-- `parent_id` — aplican igual a un comentario que a una respuesta, así que
-- no hace falta tocarlas.

alter table lesson_comments add column parent_id uuid references lesson_comments(id) on delete cascade;

create index lesson_comments_parent_id_idx on lesson_comments(parent_id);
