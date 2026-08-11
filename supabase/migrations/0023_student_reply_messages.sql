-- El alumno tenía dónde LEER mensajes ("Mensajes") pero ninguna política
-- RLS le dejaba insertar uno propio — sólo existía la de staff. Un alumno
-- sólo puede escribirse a sí mismo como `student_id` (no puede mandar
-- mensajes a nombre de otro alumno).
create policy "el estudiante responde sus mensajes"
  on messages for insert
  with check (sender_id = (select auth.uid()) and student_id = (select auth.uid()));
