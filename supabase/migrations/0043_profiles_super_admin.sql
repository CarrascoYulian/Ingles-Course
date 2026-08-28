-- Super admin: dueño del sistema, único capaz de invitar, borrar y
-- desactivar a otros miembros del staff. Sin esto, cualquier admin podía
-- gestionar a los demás — incluido borrar al propio dueño.
alter table profiles add column is_super_admin boolean not null default false;

update profiles set is_super_admin = true
where id = (select id from auth.users where email = 'berthocommunity@gmail.com');
