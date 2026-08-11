-- `practice_progress` sólo tenía políticas de select/insert. Las rutas
-- `/api/practice/answer` y `/api/practice/advance` hacen `upsert` bajo RLS
-- de usuario (no service role): el primer intento de cada alumno insertaba
-- bien, pero el segundo disparaba un UPDATE sin política que lo permitiera
-- — el guardado de progreso fallaba con un 500 a partir del segundo intento.
create policy "práctica propia actualizable"
  on practice_progress for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());
