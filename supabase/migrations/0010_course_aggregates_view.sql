-- `courses.list()` traía todas las filas de `enrollments` de cada curso a
-- JS sólo para promediar `progress` en el cliente — con miles de alumnos,
-- miles de filas viajan por la red para calcular un solo número. Postgres ya
-- sabe agregar: esta vista lo hace en el servidor, una fila por curso.
create or replace view public.course_aggregates as
select
  course_id,
  count(*)::int as students,
  coalesce(avg(progress), 0)::numeric as avg_progress
from enrollments
group by course_id;
