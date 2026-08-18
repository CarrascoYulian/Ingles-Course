-- `course_resources` sólo tenía `course_id`: un PDF subido en el módulo 1
-- aparecía en la pestaña "Archivos" de CUALQUIER lección de CUALQUIER
-- módulo de ese curso — y, peor, `/api/resources` combinaba los recursos
-- de TODOS los cursos en los que el alumno está matriculado sin filtrar
-- por el curso que en verdad está viendo. Se agrega `module_id` para poder
-- acotar la consulta al módulo real; las filas ya existentes (subidas
-- antes de este cambio) quedan sin módulo asignado — sólo dejan de verse
-- en la pestaña de la lección, no se borran, y se pueden seguir
-- gestionando desde el panel de admin.

alter table course_resources add column module_id uuid references modules(id) on delete cascade;

create index course_resources_module_idx on course_resources (module_id);
