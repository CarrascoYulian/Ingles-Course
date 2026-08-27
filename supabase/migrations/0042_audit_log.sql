-- Log de auditoría para acciones destructivas/críticas del panel admin.
--
-- Los borrados de curso/módulo/lección/quiz/tarea y el toggle de
-- publicado/archivado NO pasan por ninguna ruta API — son llamadas
-- directas del cliente a Supabase, autorizadas solo por RLS. Por eso se
-- loguean con triggers (ven `auth.uid()` de la sesión anon real) en vez
-- de instrumentar cada mutación desde la app. Las acciones que sí pasan
-- por una ruta API con cliente admin (invitar/borrar/desactivar
-- estudiante o staff) insertan explícitamente desde la ruta, porque
-- `auth.uid()` no está disponible en una conexión service-role.

create table audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references profiles (id) on delete set null,
  actor_name   text not null,
  action       text not null,
  entity_type  text not null,
  entity_id    uuid,
  entity_label text,
  created_at   timestamptz not null default now()
);

create index audit_log_created_idx on audit_log (created_at desc);

alter table audit_log enable row level security;

create policy "admin lee auditoria" on audit_log for select using (is_admin());
-- Sin política de insert: los triggers corren security definer y las
-- rutas API insertan con el cliente admin (bypassa RLS). Nadie más escribe.

create or replace function log_delete_event() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  label text;
begin
  label := coalesce(
    (to_jsonb(OLD) ->> 'title'),
    (to_jsonb(OLD) ->> 'name'),
    TG_ARGV[0]
  );
  insert into audit_log (actor_id, actor_name, action, entity_type, entity_id, entity_label)
  values (
    auth.uid(),
    coalesce((select full_name from profiles where id = auth.uid()), 'Sistema'),
    'delete', TG_ARGV[0], OLD.id, label
  );
  return OLD;
end;
$$;

create trigger courses_audit_delete after delete on courses
  for each row execute function log_delete_event('course');
create trigger modules_audit_delete after delete on modules
  for each row execute function log_delete_event('module');
create trigger lessons_audit_delete after delete on lessons
  for each row execute function log_delete_event('lesson');
create trigger quizzes_audit_delete after delete on quizzes
  for each row execute function log_delete_event('quiz');
create trigger assignments_audit_delete after delete on assignments
  for each row execute function log_delete_event('assignment');

create or replace function log_course_state_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if NEW.published is distinct from OLD.published then
    insert into audit_log (actor_id, actor_name, action, entity_type, entity_id, entity_label)
    values (
      auth.uid(),
      coalesce((select full_name from profiles where id = auth.uid()), 'Sistema'),
      case when NEW.published then 'publish' else 'unpublish' end,
      'course', NEW.id, NEW.name
    );
  end if;

  if NEW.archived is distinct from OLD.archived then
    insert into audit_log (actor_id, actor_name, action, entity_type, entity_id, entity_label)
    values (
      auth.uid(),
      coalesce((select full_name from profiles where id = auth.uid()), 'Sistema'),
      case when NEW.archived then 'archive' else 'unarchive' end,
      'course', NEW.id, NEW.name
    );
  end if;

  return NEW;
end;
$$;

create trigger courses_audit_state after update on courses
  for each row execute function log_course_state_change();
