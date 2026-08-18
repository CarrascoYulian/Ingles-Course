-- El indicador de "no leído" sólo existía para el lado del alumno
-- (`read_at`, marcado solo cuando el remitente es el docente). No había
-- forma de saber si el DOCENTE ya había leído un mensaje que le escribió un
-- alumno — de ahí que no pudiera existir una bolita de "mensajes pendientes"
-- en el panel docente. `read_by_staff_at` es el mismo concepto espejado: se
-- marca solo (igual que `read_at` para el alumno que escribe su propio
-- mensaje) cuando el remitente es staff, y queda null hasta que un docente
-- abre el hilo de ese alumno.
alter table messages add column read_by_staff_at timestamptz;

update messages set read_by_staff_at = now() where sender_id != student_id;

create policy "docentes marcan mensajes como leídos"
  on messages for update using (is_staff())
  with check (is_staff());
