-- El banco de 80 preguntas de la migración 0018 era contenido semilla fijo,
-- pensado como referencia de diseño. Ahora el profesor gestiona el banco
-- desde el panel docente (`/admin/practica`): se borra el contenido semilla
-- y se permite marcar 1 o 2 respuestas correctas por pregunta en vez de
-- una sola siempre.
delete from practice_questions;

alter table practice_questions
  drop column correct_option_id,
  add column correct_option_ids text[] not null,
  add constraint practice_questions_correct_option_ids_check
    check (array_length(correct_option_ids, 1) between 1 and 2);
