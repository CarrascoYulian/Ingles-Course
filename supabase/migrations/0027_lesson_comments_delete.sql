-- Borrado de comentarios: hasta ahora `lesson_comments` sólo tenía
-- políticas de select/insert, ningún alumno ni docente podía borrar un
-- comentario propio ni ajeno sin saltarse RLS.

create policy "docentes borran cualquier comentario"
on lesson_comments for delete
using (is_staff());

create policy "alumnos borran su propio comentario"
on lesson_comments for delete
using (is_active_student() and author_id = (select auth.uid()));
