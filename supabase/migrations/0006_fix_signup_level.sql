-- ============================================================================
-- Corrige handle_new_user(): ignoraba el nivel (CEFR) enviado en los
-- metadatos del usuario y ponía siempre 'A1' a cualquier alta nueva.
-- ============================================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, role, full_name, enrollment_code, level)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'student'),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'enrollment_code',
    coalesce((new.raw_user_meta_data ->> 'level')::cefr_level, 'A1')
  );
  return new;
end;
$$;
