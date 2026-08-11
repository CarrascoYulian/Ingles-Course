-- Los corazones eran un valor decorativo fijo `{ total: 3, remaining: 1 }`
-- devuelto por la API sin importar cuántas veces fallara el alumno. Se
-- persiste el número real de corazones restantes por estudiante.
alter table practice_progress
  add column hearts_remaining integer not null default 3
    check (hearts_remaining >= 0 and hearts_remaining <= 3);
