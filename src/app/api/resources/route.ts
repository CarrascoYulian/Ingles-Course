import { NextResponse } from 'next/server';

import { guard, isDenied } from '../_lib/guard';
import { IS_DEMO_MODE } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { DEMO_RESOURCES } from '@/services/demo/data';
import type { CourseResource } from '@/types';

export const runtime = 'nodejs';

/**
 * Material descargable de los módulos ya desbloqueados por el alumno.
 *
 * Antes devolvía siempre `DEMO_RESOURCES`, incluso con Supabase configurado
 * — no existía tabla para responder con nada real (`course_resources`,
 * añadida en 0005_resources_levels_activity.sql). Ahora consulta los
 * recursos de los cursos en los que el usuario está matriculado.
 *
 * Sin `courseId`/`moduleId` en la query: se usa para la biblioteca completa
 * en `/recursos` (todo lo matriculado). Con `courseId` (y opcionalmente
 * `moduleId`): se usa desde la pestaña "Archivos" de una lección concreta
 * — antes ignoraba ambos parámetros y siempre devolvía TODOS los recursos
 * de TODOS los cursos matriculados, así que un archivo subido en el curso
 * B aparecía también viendo una lección del curso A.
 */
export async function GET(request: Request) {
  const result = await guard('course:read');
  if (isDenied(result)) return result.response;

  const { searchParams } = new URL(request.url);
  const courseIdFilter = searchParams.get('courseId');
  const moduleIdFilter = searchParams.get('moduleId');

  if (IS_DEMO_MODE) {
    return NextResponse.json(DEMO_RESOURCES, {
      headers: { 'Cache-Control': 'private, max-age=600' },
    });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase no disponible' }, { status: 503 });

  const { data: enrollments, error: enrollmentsError } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', result.profile.id);

  if (enrollmentsError) {
    return NextResponse.json({ error: enrollmentsError.message }, { status: 500 });
  }

  const enrolledCourseIds = (enrollments ?? []).map((row) => row.course_id);
  // Filtrar por `courseId` no basta por sí solo: sin cruzarlo con las
  // matrículas reales, un alumno podría pedir recursos de un curso ajeno
  // pasando cualquier id en la URL.
  const courseIds =
    courseIdFilter && enrolledCourseIds.includes(courseIdFilter) ? [courseIdFilter] : enrolledCourseIds;
  if (courseIds.length === 0) {
    return NextResponse.json([], { headers: { 'Cache-Control': 'private, max-age=600' } });
  }

  let query = supabase.from('course_resources').select('*').in('course_id', courseIds);
  if (moduleIdFilter) query = query.eq('module_id', moduleIdFilter);
  const { data: rows, error } = await query.order('position');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const resources: CourseResource[] = (rows ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    meta: row.meta,
    mediaKey: row.media_key,
  }));

  return NextResponse.json(resources, { headers: { 'Cache-Control': 'private, max-age=600' } });
}
