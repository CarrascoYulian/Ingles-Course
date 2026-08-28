-- La política `profiles for all using (is_admin())` deja que cualquier
-- admin actualice CUALQUIER columna de CUALQUIER perfil vía el cliente
-- normal (RLS es a nivel de fila, no de columna). Sin este revoke, un
-- admin cualquiera podría hacer
-- `supabase.from('profiles').update({ is_super_admin: true })` desde el
-- navegador y auto-ascenderse a dueño — las rutas API que sí lo bloquean
-- (`/api/staff/*`) no protegen contra un cliente que hable directo con
-- postgrest. Sólo el service role (que ignora privilegios de columna)
-- puede tocar esta columna.
revoke update (is_super_admin) on profiles from authenticated;
