-- `is_active` en `profiles` nunca se comprobaba en ninguna política RLS: un
-- alumno desactivado podía seguir jugando Práctica con su sesión de Supabase
-- Auth intacta (desactivar un perfil no revoca el JWT). Se restringe aquí,
-- que es el flujo señalado por la auditoría — el resto de tablas comparten
-- el mismo vacío y quedan para una pasada de seguridad dedicada.
create or replace function is_active_student()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select p.is_active from profiles p where p.id = auth.uid()), false);
$$;

drop policy "práctica propia visible" on practice_progress;
create policy "práctica propia visible"
  on practice_progress for select
  using ((student_id = auth.uid() and is_active_student()) or is_staff());

drop policy "práctica propia insertable" on practice_progress;
create policy "práctica propia insertable"
  on practice_progress for insert
  with check (student_id = auth.uid() and is_active_student());

drop policy "práctica propia actualizable" on practice_progress;
create policy "práctica propia actualizable"
  on practice_progress for update
  using (student_id = auth.uid() and is_active_student())
  with check (student_id = auth.uid() and is_active_student());
