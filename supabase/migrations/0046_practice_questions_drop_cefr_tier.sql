-- BerthoGo nunca estuvo segmentado por nivel CEFR en el lado del alumno: es
-- el mismo juego para todos, sólo que antes las preguntas venían
-- hardcodeadas en TS. La migración 0045 preservó el `cefr_tier` heredado de
-- la migración 0018 (semilla original) y agregó pestañas A1-C1 al panel
-- docente, pero eso reintrodujo una segmentación que el juego real nunca
-- tuvo. El banco vuelve a ser uno solo, ordenado por `position`.
delete from practice_questions;

alter table practice_questions
  drop column cefr_tier,
  add constraint practice_questions_position_key unique (position);
