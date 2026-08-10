-- El código de matrícula se calculaba con `count(*) + 1`, no atómico: dos
-- invitaciones simultáneas podían generar el mismo `enrollment_code` (columna
-- `unique`) y la segunda fallaba con un error de Postgres confuso en vez de
-- uno claro. Una secuencia es segura ante concurrencia por diseño.
create sequence if not exists enrollment_code_seq;

-- Arranca después del código más alto ya emitido, para no chocar con
-- matrículas existentes creadas antes de esta migración.
select setval(
  'enrollment_code_seq',
  coalesce(
    (select max(substring(enrollment_code from 5)::int) from profiles where enrollment_code ~ '^ING-\d+$'),
    0
  ) + 1,
  false
);

create or replace function public.next_enrollment_code()
returns text
language sql
as $$
  select 'ING-' || lpad(nextval('enrollment_code_seq')::text, 6, '0');
$$;
