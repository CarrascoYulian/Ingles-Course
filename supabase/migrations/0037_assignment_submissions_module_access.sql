-- ============================================================================
-- Corrige un hueco de autorización en 0036_assignments.sql: las políticas de
-- INSERT/DELETE de `assignment_submissions` sólo comprobaban `student_id`,
-- `is_active_student()` y la ventana de tiempo — a diferencia de la política
-- de SELECT de `assignments`, nunca verificaban `module_access`. Un alumno
-- que averiguara (o adivinara) el `assignment_id` de un módulo al que nunca
-- se le otorgó acceso podía igual insertar/borrar una entrega para él,
-- aunque ni siquiera pudiera ver la tarea por RLS de lectura.
-- ============================================================================

drop policy "alumno entrega antes de vencer" on assignment_submissions;
create policy "alumno entrega antes de vencer"
  on assignment_submissions for insert with check (
    student_id = (select auth.uid())
    and is_active_student()
    and exists (
      select 1 from assignments a
      join modules m on m.id = a.module_id
      join courses c on c.id = m.course_id
      join module_access ma on ma.module_id = m.id
      where a.id = assignment_submissions.assignment_id
        and a.due_at > now()
        and c.published
        and ma.student_id = (select auth.uid())
    )
  );

drop policy "alumno borra su entrega si aún no venció ni se calificó" on assignment_submissions;
create policy "alumno borra su entrega si aún no venció ni se calificó"
  on assignment_submissions for delete using (
    student_id = (select auth.uid())
    and is_active_student()
    and graded_at is null
    and exists (
      select 1 from assignments a
      join modules m on m.id = a.module_id
      join courses c on c.id = m.course_id
      join module_access ma on ma.module_id = m.id
      where a.id = assignment_submissions.assignment_id
        and a.due_at > now()
        and c.published
        and ma.student_id = (select auth.uid())
    )
  );
