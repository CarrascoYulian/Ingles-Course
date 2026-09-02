import { inferBlockType } from '@/features/content/infer-block-type';
import { canStudentDelete, canStudentSubmit } from '@/features/assignments/submission-rules';
import { isStaff } from '@/lib/auth/rbac';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { DEMO_QUESTION } from '../demo/data';
import type { AttachUploadInput, Backend, CreateAssignmentInput } from '../ports';
import { toAssignment, toAssignmentSubmission, toCourse, toLesson, toModule, toStudentSummary } from './mappers';
import type { Course, PracticeQuestionAdmin, PracticeSession, ReportRange, StaffMember, UserRole } from '@/types';
import type { Database } from '@/types';

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

/**
 * Adaptador Supabase. Ejecuta en el navegador bajo RLS: cada consulta ya
 * viene filtrada por las políticas del servidor, así que aquí no se repite
 * ninguna comprobación de autorización.
 */

function db() {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error('Supabase no está configurado');
  return client;
}

/**
 * Normaliza el error de PostgREST a algo accionable en la UI.
 *
 * El parámetro de tipo se fija explícitamente en cada llamada
 * (`unwrap<Row>(...)`), en lugar de dejar que TypeScript lo infiera del
 * argumento: `PostgrestSingleResponse<T>` es una unión `{data:T,error:null} |
 * {data:null,error:PostgrestError}`, y al inferir T desde una unión así
 * TypeScript ensancha el resultado a `T | null` — el propio `null` se cuela
 * como parte de T y esta función deja de proteger nada.
 */
function unwrap<T>(response: { data: T | null; error: { message: string } | null }): T {
  if (response.error) throw new Error(response.error.message);
  if (response.data === null) throw new Error('Respuesta vacía del servidor');
  return response.data;
}

const STUDENTS_PAGE_SIZE = 20;

/**
 * Borra objetos reales en R2 vía `/api/storage/delete` — no se puede llamar
 * a `src/lib/storage.ts` directo desde acá porque está marcado
 * `server-only` y este adaptador corre en el navegador. Antes esto llamaba
 * a `db().storage.from('course-files').remove()` (API de Supabase Storage
 * sobre el bucket viejo, pre-R2): no borraba nada real, sólo fallaba en
 * silencio contra un bucket sin estos objetos — el huérfano igual se
 * limpiaba, pero recién con el cron semanal de reconciliación.
 *
 * Sigue sin abortar el flujo que la llamó si falla: la fila en Postgres ya
 * se borró o está por borrarse, y el objeto que quede huérfano lo recoge el
 * job de reconciliación semanal como red de seguridad — no bloquear la UI
 * del docente por un error transitorio de Storage es preferible a
 * arriesgar una fila que no se puede volver a borrar desde la interfaz.
 */
async function removeStorageObjects(mediaKeys: string[]): Promise<void> {
  const keys = mediaKeys.filter((key): key is string => Boolean(key));
  if (keys.length === 0) return;
  try {
    const response = await fetch('/api/storage/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaKeys: keys }),
    });
    if (!response.ok) console.error('No se pudieron borrar objetos de Storage', await response.text());
  } catch (error) {
    console.error('No se pudieron borrar objetos de Storage', error);
  }
}

/** Todas las claves de archivo que cuelgan de un curso, vía sus módulos. */
async function collectCourseMediaKeys(courseId: string): Promise<string[]> {
  const { data: modules } = await db().from('modules').select('id').eq('course_id', courseId);
  const moduleIds = (modules ?? []).map((row) => row.id);
  if (moduleIds.length === 0) return [];

  const { data } = await db()
    .from('lessons')
    .select('media_key')
    .in('module_id', moduleIds)
    .not('media_key', 'is', null);
  return (data ?? []).map((row) => row.media_key).filter((key): key is string => Boolean(key));
}

/** Mismo criterio que `collectCourseMediaKeys`, pero para una sola unidad. */
async function collectModuleMediaKeys(moduleId: string): Promise<string[]> {
  const { data } = await db()
    .from('lessons')
    .select('media_key')
    .eq('module_id', moduleId)
    .not('media_key', 'is', null);
  return (data ?? []).map((row) => row.media_key).filter((key): key is string => Boolean(key));
}

type ActivityTone = 'success' | 'info' | 'warning' | 'danger';
type ActivitySegment = { text: string; strong?: boolean };

/**
 * Registra una entrada real en `activity_log`. Es lo que hace que
 * "Actividad reciente" del dashboard muestre hechos de verdad en vez de la
 * lista de ejemplo fija que se servía antes sin importar qué pasara.
 *
 * Falla en silencio a propósito: la actividad es un efecto secundario de
 * auditoría, nunca debe poder tumbar la acción principal (publicar un
 * curso no debe fallar porque el log falló).
 */
async function logActivity(tone: ActivityTone, segments: ActivitySegment[]): Promise<void> {
  try {
    await db().from('activity_log').insert({ tone, segments });
  } catch {
    // Ver comentario arriba.
  }
}

/**
 * Antes `addBlock`/`attachUpload` calculaban la posición con `count(*)` de
 * filas del módulo. Eso se rompe en cuanto se borra un bloque: si quedan 2
 * filas pero una ocupa `position = 1` (por el hueco que dejó el borrado),
 * `count()` sigue devolviendo 2, y el próximo insert también intenta
 * `position = 2`... pero si el hueco dejó la fila sobreviviente exactamente
 * en la posición que `count()` iba a reutilizar, el insert choca contra la
 * restricción única `(module_id, position)` — el error real reportado en
 * vivo («duplicate key value violates unique constraint
 * "content_blocks_module_id_position_key"»). `MAX(position) + 1` no tiene
 * ese problema: siempre apunta después del último bloque real, haya huecos
 * o no.
 */
async function nextBlockPosition(moduleId: string): Promise<number> {
  const { data } = await db()
    .from('lessons')
    .select('position')
    .eq('module_id', moduleId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? -1) + 1;
}

export const supabaseBackend: Backend = {
  courses: {
    async list() {
      // Antes se traían TODAS las filas de `enrollments` de cada curso a JS
      // sólo para promediar `progress` aquí — con miles de alumnos, miles de
      // filas cruzaban la red para calcular un número. `course_aggregates`
      // es una vista que agrega en el propio Postgres.
      // Sin límite superior: un catálogo con cientos de cursos traería todo
      // de una vez. Mismo patrón defensivo que `listLessons` — 200 cursos ya
      // es más de lo que un solo panel debería listar sin paginar de verdad.
      const [coursesResult, aggregatesResult] = await Promise.all([
        db().from('courses').select('*, modules(count)').order('position', { ascending: true }).limit(200),
        db().from('course_aggregates').select('*'),
      ]);
      const rows = unwrap(coursesResult);
      const aggregates = unwrap(aggregatesResult);
      const aggByCourse = new Map(aggregates.map((a) => [a.course_id, a]));

      return rows.map((row) => {
        const modules = (row as unknown as { modules: { count: number }[] }).modules;
        const agg = aggByCourse.get(row.id);
        return toCourse(row, {
          students: agg?.students ?? 0,
          progress: agg?.avg_progress ?? 0,
          modules: modules[0]?.count ?? 0,
        });
      });
    },

    async create({ name, level }) {
      const { count } = await db().from('courses').select('*', { count: 'exact', head: true });
      const row = unwrap<Row<'courses'>>(
        await db()
          .from('courses')
          .insert({ name, level, published: false, position: count ?? 0, created_by: null })
          .select()
          .single(),
      );
      return toCourse(row, { students: 0, progress: 0, modules: 0 });
    },

    async update(id, { name, level }) {
      const row = unwrap<Row<'courses'>>(
        await db().from('courses').update({ name, level }).eq('id', id).select().single(),
      );
      const [{ count: students }, { data: enrollments }] = await Promise.all([
        db().from('enrollments').select('*', { count: 'exact', head: true }).eq('course_id', id),
        db().from('enrollments').select('progress').eq('course_id', id),
      ]);
      const average =
        enrollments && enrollments.length > 0
          ? enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length
          : 0;
      const { count: modules } = await db()
        .from('modules')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', id);
      return toCourse(row, { students: students ?? 0, progress: average, modules: modules ?? 0 });
    },

    async setPublished(id, published) {
      const row = unwrap<Row<'courses'>>(
        await db().from('courses').update({ published }).eq('id', id).select().single(),
      );
      await logActivity(published ? 'success' : 'warning', [
        { text: published ? 'Curso publicado · ' : 'Curso ocultado · ' },
        { text: row.name, strong: true },
      ]);
      return toCourse(row, { students: 0, progress: 0, modules: 0 }) as Course;
    },

    async setArchived(id, archived) {
      const row = unwrap<Row<'courses'>>(
        await db().from('courses').update({ archived }).eq('id', id).select().single(),
      );
      await logActivity(archived ? 'warning' : 'info', [
        { text: archived ? 'Curso archivado · ' : 'Curso restaurado del archivo · ' },
        { text: row.name, strong: true },
      ]);
      return toCourse(row, { students: 0, progress: 0, modules: 0 }) as Course;
    },

    async remove(id) {
      // Igual que en `removeBlock`: hay que leer las claves antes de borrar,
      // porque el cascade de Postgres se lleva `modules` → `lessons` en el
      // mismo statement y después ya no queda nada que consultar.
      const mediaKeys = await collectCourseMediaKeys(id);

      const { error } = await db().from('courses').delete().eq('id', id);
      if (error) throw new Error(error.message);

      await removeStorageObjects(mediaKeys);
    },

    async reorder(id, direction) {
      const courses = await supabaseBackend.courses.list();
      const from = courses.findIndex((c) => c.id === id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= courses.length) return courses;

      const a = courses[from]!;
      const b = courses[to]!;
      // RPC atómico — mismo patrón que `swap_lesson_position`: dos updates
      // independientes no son atómicos y podían dejar dos cursos con la
      // misma posición si uno fallaba a mitad de camino.
      const { error } = await db().rpc('swap_course_position', {
        course_a_id: a.id,
        course_b_id: b.id,
      });
      if (error) throw new Error(error.message);
      return supabaseBackend.courses.list();
    },

    async getPublishWarnings(courseId) {
      const modules = unwrap<Row<'modules'>[]>(
        await db().from('modules').select('*').eq('course_id', courseId).order('position'),
      );
      if (modules.length === 0) return [];
      const moduleIds = modules.map((m) => m.id);

      const [{ data: lessons }, { data: quizzes }] = await Promise.all([
        db().from('lessons').select('module_id').in('module_id', moduleIds),
        db().from('quizzes').select('module_id').in('module_id', moduleIds),
      ]);

      const moduleIdsWithLessons = new Set((lessons ?? []).map((l) => l.module_id));
      const moduleIdsWithQuiz = new Set((quizzes ?? []).map((q) => q.module_id));

      return modules
        .map((module) => ({
          moduleId: module.id,
          title: module.title,
          empty: !moduleIdsWithLessons.has(module.id),
          missingQuiz: !moduleIdsWithQuiz.has(module.id),
        }))
        .filter((warning) => warning.empty || warning.missingQuiz);
    },
  },

  content: {
    async getModule(moduleId) {
      return toModule(unwrap(await db().from('modules').select('*').eq('id', moduleId).single()));
    },

    async listModules(courseId) {
      const rows = unwrap(
        await db()
          .from('modules')
          .select('*')
          .eq('course_id', courseId)
          .order('position', { ascending: true }),
      );
      return rows.map(toModule);
    },

    async updateModule(moduleId, { title, requiresModuleId }) {
      const row = unwrap<Row<'modules'>>(
        await db()
          .from('modules')
          .update({ title, requires_module_id: requiresModuleId })
          .eq('id', moduleId)
          .select()
          .single(),
      );
      return toModule(row);
    },

    async removeModule(moduleId) {
      // Igual que en `courses.remove`: hay que leer las claves antes de
      // borrar, porque el cascade de Postgres se lleva `modules` → `lessons`
      // en el mismo statement y después ya no queda nada que consultar.
      const mediaKeys = await collectModuleMediaKeys(moduleId);

      const { error } = await db().from('modules').delete().eq('id', moduleId);
      if (error) throw new Error(error.message);

      await removeStorageObjects(mediaKeys);
    },

    async reorderModule(moduleId, direction) {
      const row = unwrap<Row<'modules'>>(
        await db().from('modules').select('*').eq('id', moduleId).single(),
      );
      const modules = await supabaseBackend.content.listModules(row.course_id);
      const from = modules.findIndex((m) => m.id === moduleId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= modules.length) return modules;

      const a = modules[from]!;
      const b = modules[to]!;
      // RPC atómico — ver `0039_module_management.sql`.
      const { error } = await db().rpc('swap_module_position', {
        module_a_id: a.id,
        module_b_id: b.id,
      });
      if (error) throw new Error(error.message);
      return supabaseBackend.content.listModules(row.course_id);
    },

    async duplicateModule(moduleId) {
      // Copiar objetos en R2 sólo es posible server-side (`storage.ts` es
      // `server-only`) — este backend corre en el navegador, así que la
      // duplicación entera vive en una ruta API, no acá.
      const response = await fetch(`/api/modules/${moduleId}/duplicate`, { method: 'POST' });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'No se pudo duplicar la unidad');
      }
      return (await response.json()) as { id: string };
    },

    async listBlocks(moduleId) {
      return supabaseBackend.learning.listLessons(moduleId);
    },

    async addBlock(moduleId, type) {
      const position = await nextBlockPosition(moduleId);

      const row = unwrap<Row<'lessons'>>(
        await db()
          .from('lessons')
          .insert({
            module_id: moduleId,
            type,
            title: `${type} sin título`,
            meta: 'Pendiente de subir',
            position,
            media_key: null,
            uploaded_by: null,
          })
          .select()
          .single(),
      );
      return toLesson(row, undefined, true);
    },

    async moveBlock(moduleId, blockId, direction) {
      const blocks = await supabaseBackend.content.listBlocks(moduleId);
      const from = blocks.findIndex((b) => b.id === blockId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= blocks.length) return blocks;

      const a = blocks[from]!;
      const b = blocks[to]!;
      // RPC atómico en vez de dos updates independientes: si uno fallara a
      // mitad de camino, dos ítems podían terminar con la misma `position`.
      const { error } = await db().rpc('swap_lesson_position', {
        lesson_a_id: a.id,
        lesson_b_id: b.id,
      });
      if (error) throw new Error(error.message);
      return supabaseBackend.content.listBlocks(moduleId);
    },

    async removeBlock(blockId) {
      // Se lee el `media_key` antes de borrar la fila: una vez borrada, ya
      // no hay forma de saber qué objeto de Storage le correspondía.
      const { data: block } = await db()
        .from('lessons')
        .select('media_key')
        .eq('id', blockId)
        .maybeSingle();

      const { error } = await db().from('lessons').delete().eq('id', blockId);
      if (error) throw new Error(error.message);

      if (block?.media_key) await removeStorageObjects([block.media_key]);
    },

    async attachUpload(input: AttachUploadInput) {
      const position = await nextBlockPosition(input.moduleId);
      const type = inferBlockType(input.contentType);

      const {
        data: { user },
      } = await db().auth.getUser();

      const title = input.fileName.replace(/\.[^.]+$/, '');
      const durationSeconds =
        type === 'Video' && input.durationSeconds ? Math.round(input.durationSeconds) : 0;

      const row = unwrap<Row<'lessons'>>(
        await db()
          .from('lessons')
          .insert({
            module_id: input.moduleId,
            type,
            title,
            meta: input.sizeLabel,
            position,
            media_key: input.mediaKey,
            uploaded_by: user?.id ?? null,
            // `duration_minutes` sigue existiendo por compatibilidad; la
            // fuente real de verdad ahora es `duration_seconds`, sin redondear
            // hacia arriba a un mínimo inventado.
            duration_minutes: Math.round(durationSeconds / 60),
            duration_seconds: type === 'Video' ? durationSeconds : null,
            description: null,
          })
          .select()
          .single(),
      );

      return toLesson(row, undefined, true);
    },

    async getFileUrl(mediaKey) {
      const response = await fetch(`/api/media?key=${encodeURIComponent(mediaKey)}`);
      if (!response.ok) return null;
      const { url } = (await response.json()) as { url: string };
      return url;
    },

    async updateLesson(lessonId, input) {
      const { error } = await db()
        .from('lessons')
        .update({
          title: input.title,
          description: input.description || null,
          transcript: input.transcript || null,
        })
        .eq('id', lessonId);
      if (error) throw new Error(error.message);
    },

    async replaceLessonMedia(lessonId, input) {
      const { data: existing } = await db()
        .from('lessons')
        .select('media_key')
        .eq('id', lessonId)
        .maybeSingle();

      const type = inferBlockType(input.contentType);
      const durationSeconds =
        type === 'Video' && input.durationSeconds ? Math.round(input.durationSeconds) : 0;

      const { error } = await db()
        .from('lessons')
        .update({
          type,
          meta: input.sizeLabel,
          media_key: input.mediaKey,
          duration_minutes: Math.round(durationSeconds / 60),
          duration_seconds: type === 'Video' ? durationSeconds : null,
        })
        .eq('id', lessonId);
      if (error) throw new Error(error.message);

      // El objeto viejo se borra recién después de confirmar el update —
      // si el update fallara, no queremos haber borrado el archivo que
      // todavía está referenciado.
      if (existing?.media_key) await removeStorageObjects([existing.media_key]);
    },

    async listCourseMedia(courseId) {
      const { data: modules } = await db().from('modules').select('id, title').eq('course_id', courseId);
      const moduleTitleById = new Map((modules ?? []).map((m) => [m.id, m.title]));
      const moduleIds = [...moduleTitleById.keys()];
      if (moduleIds.length === 0) return [];

      const { data: lessons } = await db()
        .from('lessons')
        .select('id, title, type, meta, module_id')
        .in('module_id', moduleIds)
        .not('media_key', 'is', null)
        .order('title');

      return (lessons ?? []).map((l) => ({
        lessonId: l.id,
        title: l.title,
        type: l.type,
        meta: l.meta,
        moduleTitle: moduleTitleById.get(l.module_id) ?? '',
      }));
    },

    async addBlockFromLibrary(moduleId, sourceLessonId) {
      const response = await fetch(`/api/lessons/${sourceLessonId}/duplicate-to`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetModuleId: moduleId }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'No se pudo reutilizar el archivo');
      }
    },
  },

  students: {
    async list({ query = '', level = 'Todos', page = 1 }) {
      const pageSize = STUDENTS_PAGE_SIZE;
      const from = (page - 1) * pageSize;

      // Antes se traía la lista entera sin límite — con cientos de alumnos,
      // cada tecleo en el buscador bajaba todas las filas de la base.
      let request = db()
        .from('profiles')
        .select('*, enrollments(progress, watched_minutes, completed_lessons, created_at)', {
          count: 'exact',
        })
        .eq('role', 'student')
        // Un alumno puede tener varias matrículas (varios cursos). Antes se
        // tomaba `enrollments[0]` sin orden, es decir, una arbitraria — la
        // más reciente es la que tiene sentido mostrar en la ficha.
        .order('created_at', { foreignTable: 'enrollments', ascending: false });

      if (level !== 'Todos') request = request.eq('level', level);
      const trimmedQuery = query.trim();
      if (trimmedQuery) {
        // `.or()` recibe una mini-sintaxis de filtros de PostgREST: una
        // búsqueda con "," o "(" sin escapar podía inyectar condiciones
        // extra en el filtro. Se escapan comillas y se elimina lo que
        // rompería la sintaxis — sigue buscando el texto tal cual.
        const safe = trimmedQuery.replace(/[,()]/g, '').replace(/"/g, '""');
        const needle = `%${safe}%`;
        request = request.or(`full_name.ilike."${needle}",enrollment_code.ilike."${needle}"`);
      }

      const response = await request.order('full_name').range(from, from + pageSize - 1);
      const rows = unwrap(response);
      const items = rows.map((row) => {
        const enrollments = (
          row as unknown as {
            enrollments: { progress: number; watched_minutes: number; completed_lessons: number }[];
          }
        ).enrollments;
        return toStudentSummary(row, enrollments[0] ?? null);
      });
      return { items, total: response.count ?? items.length, page, pageSize };
    },

    async resetProgress(id) {
      await db()
        .from('enrollments')
        .update({ progress: 0, watched_minutes: 0, completed_lessons: 0 })
        .eq('student_id', id);
      await db().from('lesson_progress').delete().eq('student_id', id);

      const row = unwrap<Row<'profiles'>>(await db().from('profiles').select('*').eq('id', id).single());
      await logActivity('danger', [
        { text: 'Progreso reiniciado · ' },
        { text: row.full_name, strong: true },
      ]);
      return toStudentSummary(row, null);
    },

    async invite(input) {
      // La alta real necesita service role: se delega a un Route Handler.
      const response = await fetch('/api/students/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'No se pudo crear el estudiante');
      }
      return (await response.json()) as { enrollmentCode: string };
    },

    async update(id, input) {
      const response = await fetch(`/api/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'No se pudo actualizar el estudiante');
      }

      const row = unwrap<Row<'profiles'>>(await db().from('profiles').select('*').eq('id', id).single());
      await logActivity('info', [
        { text: 'Datos actualizados · ' },
        { text: row.full_name, strong: true },
      ]);
      const enrollment = unwrap<
        Pick<Row<'enrollments'>, 'progress' | 'watched_minutes' | 'completed_lessons'>[]
      >(
        await db()
          .from('enrollments')
          .select('progress, watched_minutes, completed_lessons')
          .eq('student_id', id)
          .order('created_at', { ascending: false })
          .limit(1),
      );
      return toStudentSummary(row, enrollment[0] ?? null);
    },

    async remove(id) {
      const row = unwrap<Row<'profiles'>>(await db().from('profiles').select('full_name').eq('id', id).single());

      const response = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'No se pudo eliminar el estudiante');
      }

      await logActivity('danger', [
        { text: 'Estudiante eliminado · ' },
        { text: row.full_name, strong: true },
      ]);
    },

    async enroll(studentId, courseId, moduleIds) {
      const { error } = await db()
        .from('enrollments')
        .upsert(
          { student_id: studentId, course_id: courseId, progress: 0, watched_minutes: 0, completed_lessons: 0 },
          { onConflict: 'student_id,course_id', ignoreDuplicates: true },
        );
      if (error) throw new Error(error.message);

      if (moduleIds.length > 0) {
        const { error: accessError } = await db()
          .from('module_access')
          .upsert(
            moduleIds.map((moduleId) => ({ student_id: studentId, module_id: moduleId })),
            { onConflict: 'student_id,module_id', ignoreDuplicates: true },
          );
        if (accessError) throw new Error(accessError.message);
      }

      const student = unwrap<Row<'profiles'>>(
        await db().from('profiles').select('full_name').eq('id', studentId).single(),
      );
      const course = unwrap<Row<'courses'>>(
        await db().from('courses').select('name').eq('id', courseId).single(),
      );
      await logActivity('success', [
        { text: student.full_name, strong: true },
        { text: ` matriculado en ` },
        { text: course.name, strong: true },
      ]);
    },

    async listEnrollments(studentId) {
      const rows = unwrap(
        await db()
          .from('enrollments')
          .select('course_id, courses(name)')
          .eq('student_id', studentId),
      );
      return rows
        .map((row) => {
          const course = (row as unknown as { courses: Pick<Row<'courses'>, 'name'> | null }).courses;
          return course ? { courseId: row.course_id, courseName: course.name } : null;
        })
        .filter((entry): entry is { courseId: string; courseName: string } => entry !== null);
    },

    async getModuleAccess(studentId, courseId) {
      const modules = unwrap(
        await db().from('modules').select('id').eq('course_id', courseId),
      );
      if (modules.length === 0) return [];
      const rows = unwrap(
        await db()
          .from('module_access')
          .select('module_id')
          .eq('student_id', studentId)
          .in('module_id', modules.map((m) => m.id)),
      );
      return rows.map((r) => r.module_id);
    },

    async setModuleAccess(studentId, courseId, moduleIds) {
      const modules = unwrap(
        await db().from('modules').select('id').eq('course_id', courseId),
      );
      const allModuleIds = modules.map((m) => m.id);
      const wanted = new Set(moduleIds);
      const toRemove = allModuleIds.filter((id) => !wanted.has(id));
      const toAdd = moduleIds.filter((id) => allModuleIds.includes(id));

      if (toRemove.length > 0) {
        const { error } = await db()
          .from('module_access')
          .delete()
          .eq('student_id', studentId)
          .in('module_id', toRemove);
        if (error) throw new Error(error.message);
      }
      if (toAdd.length > 0) {
        const { error } = await db()
          .from('module_access')
          .upsert(
            toAdd.map((moduleId) => ({ student_id: studentId, module_id: moduleId })),
            { onConflict: 'student_id,module_id', ignoreDuplicates: true },
          );
        if (error) throw new Error(error.message);
      }

      const student = unwrap<Row<'profiles'>>(
        await db().from('profiles').select('full_name').eq('id', studentId).single(),
      );
      await logActivity('success', [
        { text: student.full_name, strong: true },
        { text: ` · acceso a unidades actualizado (${moduleIds.length})` },
      ]);
    },

    async sendMessage(id, body) {
      const response = await fetch('/api/students/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: id, body }),
      });
      if (!response.ok) throw new Error('No se pudo enviar el mensaje');
    },

    async setActive(id, active) {
      const response = await fetch(`/api/students/${id}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'No se pudo cambiar el estado del estudiante');
      }

      const row = unwrap<Row<'profiles'>>(await db().from('profiles').select('*').eq('id', id).single());
      await logActivity(active ? 'success' : 'warning', [
        { text: active ? 'Estudiante activado · ' : 'Estudiante desactivado · ' },
        { text: row.full_name, strong: true },
      ]);
      const enrollment = unwrap<
        Pick<Row<'enrollments'>, 'progress' | 'watched_minutes' | 'completed_lessons'>[]
      >(
        await db()
          .from('enrollments')
          .select('progress, watched_minutes, completed_lessons')
          .eq('student_id', id)
          .order('created_at', { ascending: false })
          .limit(1),
      );
      return toStudentSummary(row, enrollment[0] ?? null);
    },
  },

  analytics: {
    async getMetrics() {
      const response = await fetch('/api/analytics/metrics');
      if (!response.ok) throw new Error('No se pudieron cargar las métricas');
      return response.json();
    },
    async getActivity() {
      const response = await fetch('/api/analytics/activity');
      if (!response.ok) throw new Error('No se pudo cargar la actividad');
      return response.json();
    },
    async getStudentPerformance({ query = '', level = 'Todos', page = 1 }) {
      const params = new URLSearchParams({ page: String(page) });
      if (query) params.set('q', query);
      if (level !== 'Todos') params.set('level', level);
      const response = await fetch(`/api/analytics/performance?${params.toString()}`);
      if (!response.ok) throw new Error('No se pudo cargar el rendimiento de los alumnos');
      return response.json();
    },
    async getReport(range: ReportRange) {
      const response = await fetch(`/api/analytics/report?range=${encodeURIComponent(range)}`);
      if (!response.ok) throw new Error('No se pudo cargar el reporte');
      return response.json();
    },

    // Sin ruta API: a diferencia de los quizzes, acá no hay ninguna columna
    // que esconderle al staff — RLS ("docentes ven todas las
    // calificaciones", 0033) ya resuelve el acceso completo.
    async getCourseRatings(courseId) {
      const rows = unwrap<Pick<Row<'course_ratings'>, 'stars' | 'review' | 'created_at'>[]>(
        await db()
          .from('course_ratings')
          .select('stars, review, created_at')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false }),
      );
      const average =
        rows.length > 0 ? rows.reduce((sum, row) => sum + row.stars, 0) / rows.length : null;
      return {
        average,
        count: rows.length,
        reviews: rows.map((row) => ({
          stars: row.stars,
          review: row.review,
          createdAt: row.created_at,
        })),
      };
    },
  },

  learning: {
    async getMyCourses() {
      const {
        data: { user },
      } = await db().auth.getUser();
      if (!user) return [];

      const rows = unwrap(
        await db()
          .from('enrollments')
          .select('progress, created_at, courses(*)')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false }),
      );
      return rows
        .map((row) => {
          const course = (row as unknown as { courses: Row<'courses'> | null }).courses;
          return course ? toCourse(course, { students: 0, progress: row.progress, modules: 0 }) : null;
        })
        .filter((course): course is Course => course !== null);
    },

    async getCurrentModule(courseId) {
      // Antes devolvía SIEMPRE el primer módulo del curso, sin importar
      // cuánto hubiera avanzado el alumno — terminar el módulo 1 entero
      // nunca llevaba al módulo 2, porque nada volvía a preguntar "¿cuál
      // es el primero que todavía no terminé?". Ahora sí: el módulo
      // "actual" es el primero (por posición) que tenga alguna lección sin
      // terminar; uno sin lecciones todavía (aún sin contenido) se salta en
      // vez de bloquear el avance. Si ya están todos completos, se cae en
      // el último para poder seguir repasando.
      // Sólo entran a la carrera los módulos a los que el alumno tiene acceso
      // otorgado — el RLS de `modules` ya filtra esto en la consulta, pero
      // acá además decide "cuál de los otorgados es el actual", no sólo "cuál
      // es el primero del curso entero".
      const modules = unwrap(
        await db().from('modules').select('*').eq('course_id', courseId).order('position'),
      );
      if (modules.length === 0) return null;
      if (modules.length === 1) return toModule(modules[0]!);

      const moduleIds = modules.map((m) => m.id);
      const lessons = unwrap(
        await db().from('lessons').select('id, module_id').in('module_id', moduleIds),
      );

      const {
        data: { user },
      } = await db().auth.getUser();
      const progress = user
        ? unwrap(
            await db()
              .from('lesson_progress')
              .select('lesson_id, completed_at')
              .eq('student_id', user.id)
              .in('lesson_id', lessons.map((l) => l.id)),
          )
        : [];
      const completedLessonIds = new Set(
        progress.filter((p) => p.completed_at).map((p) => p.lesson_id),
      );

      for (const m of modules) {
        const moduleLessons = lessons.filter((l) => l.module_id === m.id);
        if (moduleLessons.length === 0) continue;
        const allDone = moduleLessons.every((l) => completedLessonIds.has(l.id));
        if (!allDone) return toModule(m);
      }
      return toModule(modules[modules.length - 1]!);
    },

    async listLessons(moduleId) {
      // Un módulo real no debería tener cientos de lecciones — el límite es
      // una salvaguarda defensiva, no una paginación (la UI las muestra
      // todas de una vez en una sola lista).
      const rows = unwrap(
        await db()
          .from('lessons')
          .select('*')
          .eq('module_id', moduleId)
          .order('position')
          .limit(200),
      );
      const progress = unwrap(
        await db()
          .from('lesson_progress')
          .select('lesson_id, watched_percent, completed_at')
          .in('lesson_id', rows.map((r) => r.id)),
      );
      const byLesson = new Map(
        progress.map((p) => [
          p.lesson_id,
          { watchedPercent: p.watched_percent, completed: Boolean(p.completed_at) },
        ]),
      );

      // El punto más lejano ya completado, igual que `maxWatched` a nivel de
      // video: nunca baja. Antes el desbloqueo dependía sólo de que la
      // lección INMEDIATAMENTE anterior mostrara `previousCompleted` en esta
      // misma pasada — al retroceder a repasar una lección ya vista, un
      // reproche de guardado en tránsito podía dejarla momentáneamente sin
      // `completed_at`, y eso volvía a bloquear TODO lo que venía después
      // aunque el alumno ya lo hubiera terminado. Con el máximo alcanzado
      // como piso, una lección ya alcanzada sigue desbloqueada aunque la
      // anterior parpadee a "no completada".
      const maxCompletedPosition = rows.reduce(
        (max, row) => (byLesson.get(row.id)?.completed ? Math.max(max, row.position) : max),
        0,
      );

      let previousCompleted = true;
      return rows.map((row) => {
        const reachedBefore = row.position <= maxCompletedPosition + 1;
        const lesson = toLesson(row, byLesson.get(row.id), previousCompleted || reachedBefore);
        previousCompleted = lesson.state === 'done';
        return lesson;
      });
    },

    async getLessonVideoUrl(mediaKey) {
      const response = await fetch(`/api/media?key=${encodeURIComponent(mediaKey)}`);
      if (!response.ok) return null;
      const { url } = (await response.json()) as { url: string };
      return url;
    },

    async listBadges() {
      const response = await fetch('/api/badges');
      if (!response.ok) throw new Error('No se pudieron cargar las insignias');
      return response.json();
    },

    async saveWatchedPercent(lessonId, percent) {
      const { error } = await db()
        .from('lesson_progress')
        .upsert(
          {
            lesson_id: lessonId,
            student_id: (await db().auth.getUser()).data.user?.id ?? '',
            watched_percent: percent,
            completed_at: percent >= 100 ? new Date().toISOString() : null,
          },
          { onConflict: 'student_id,lesson_id' },
        );
      if (error) throw new Error(error.message);
    },

    // Un ítem sin reproductor (PDF/Audio/Ejercicio) no tiene "porcentaje
    // visto" real — llegar a él ya es "verlo entero". Reutiliza el mismo
    // upsert que el video para no duplicar la lógica que dispara
    // `recalc_enrollment_progress()`.
    async markLessonViewed(lessonId) {
      await supabaseBackend.learning.saveWatchedPercent(lessonId, 100);
    },

    async getMyProgress(courseId) {
      const {
        data: { user },
      } = await db().auth.getUser();

      const empty = { percent: 0, level: 'A1' as const, hoursStudied: 0, lessonsCompleted: 0, badgesEarned: 0 };
      if (!user) return empty;

      const [profileResult, enrollmentResult, badgesResult] = await Promise.all([
        db().from('profiles').select('level').eq('id', user.id).single(),
        // Antes: sin `.eq('course_id', ...)`, ordenaba por `created_at` y
        // tomaba la matrícula más reciente sin importar cuál — con dos
        // cursos, terminar módulos del curso A podía seguir mostrando el
        // progreso (0 %) del curso B si ese se matriculó después.
        db()
          .from('enrollments')
          .select('progress, watched_minutes, completed_lessons')
          .eq('student_id', user.id)
          .eq('course_id', courseId)
          .maybeSingle(),
        db()
          .from('student_badges')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', user.id),
      ]);

      return {
        percent: Math.round(enrollmentResult.data?.progress ?? 0),
        level: profileResult.data?.level ?? 'A1',
        hoursStudied: Math.round((enrollmentResult.data?.watched_minutes ?? 0) / 60),
        lessonsCompleted: enrollmentResult.data?.completed_lessons ?? 0,
        badgesEarned: badgesResult.count ?? 0,
      };
    },

    async createModule({ courseId, title }) {
      const { count } = await db()
        .from('modules')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);

      const row = unwrap<Row<'modules'>>(
        await db()
          .from('modules')
          .insert({
            course_id: courseId,
            title,
            position: count ?? 0,
            requires_module_id: null,
          })
          .select()
          .single(),
      );
      return toModule(row);
    },

    async listNotes(lessonId) {
      const {
        data: { user },
      } = await db().auth.getUser();
      if (!user) return [];

      const rows = unwrap(
        await db()
          .from('lesson_notes')
          .select('*')
          .eq('lesson_id', lessonId)
          .eq('student_id', user.id)
          .order('timestamp_seconds', { ascending: true }),
      );
      return rows.map((row) => ({
        id: row.id,
        lessonId: row.lesson_id,
        body: row.body,
        timestampSeconds: row.timestamp_seconds,
        createdAt: row.created_at,
      }));
    },

    async addNote(lessonId, body, timestampSeconds) {
      const {
        data: { user },
      } = await db().auth.getUser();
      if (!user) throw new Error('No autenticado');

      const row = unwrap<Row<'lesson_notes'>>(
        await db()
          .from('lesson_notes')
          .insert({
            lesson_id: lessonId,
            student_id: user.id,
            body,
            timestamp_seconds: Math.round(timestampSeconds),
          })
          .select()
          .single(),
      );
      return {
        id: row.id,
        lessonId: row.lesson_id,
        body: row.body,
        timestampSeconds: row.timestamp_seconds,
        createdAt: row.created_at,
      };
    },

    async getMyMessages() {
      const {
        data: { user },
      } = await db().auth.getUser();
      if (!user) return [];

      const rows = unwrap(
        await db()
          .from('messages')
          .select('id, sender_id, body, created_at, read_at')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false }),
      );
      return rows.map((row) => ({
        id: row.id,
        body: row.body,
        createdAt: row.created_at,
        fromStaff: row.sender_id !== user.id,
        readAt: row.read_at,
      }));
    },

    async markMessageRead(id) {
      const { error } = await db()
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .is('read_at', null);
      if (error) throw new Error(error.message);
    },

    async sendMyMessage(body) {
      const {
        data: { user },
      } = await db().auth.getUser();
      if (!user) throw new Error('No autenticado');

      const { error } = await db()
        .from('messages')
        .insert({
          sender_id: user.id,
          student_id: user.id,
          body,
          read_at: new Date().toISOString(),
          read_by_staff_at: null,
        });
      if (error) throw new Error(error.message);
    },

    async listComments(lessonId) {
      const rows = unwrap(
        await db()
          .from('lesson_comments')
          .select('*, profiles(full_name, role)')
          .eq('lesson_id', lessonId)
          .order('created_at', { ascending: true }),
      );
      return rows.map((row) => {
        const author = (
          row as unknown as { profiles: Pick<Row<'profiles'>, 'full_name' | 'role'> | null }
        ).profiles;
        return {
          id: row.id,
          lessonId: row.lesson_id,
          authorId: row.author_id,
          authorName: author?.full_name ?? 'Usuario',
          fromStaff: isStaff((author?.role as UserRole) ?? null),
          body: row.body,
          createdAt: row.created_at,
          parentId: row.parent_id,
        };
      });
    },

    async addComment(lessonId, body, parentId) {
      const {
        data: { user },
      } = await db().auth.getUser();
      if (!user) throw new Error('No autenticado');

      const row = unwrap<Row<'lesson_comments'>>(
        await db()
          .from('lesson_comments')
          .insert({ lesson_id: lessonId, author_id: user.id, body, parent_id: parentId ?? null })
          .select()
          .single(),
      );
      const profile = unwrap<Pick<Row<'profiles'>, 'full_name' | 'role'>>(
        await db().from('profiles').select('full_name, role').eq('id', user.id).single(),
      );

      return {
        id: row.id,
        lessonId: row.lesson_id,
        authorId: row.author_id,
        authorName: profile.full_name,
        fromStaff: isStaff(profile.role as UserRole),
        body: row.body,
        createdAt: row.created_at,
        parentId: row.parent_id,
      };
    },

    async deleteComment(commentId) {
      const { error } = await db().from('lesson_comments').delete().eq('id', commentId);
      if (error) throw new Error(error.message);
    },

    async getCommentsLastSeen(lessonId) {
      const {
        data: { user },
      } = await db().auth.getUser();
      if (!user) return null;

      const row = unwrap<Pick<Row<'lesson_comment_reads'>, 'last_seen_at'> | null>(
        await db()
          .from('lesson_comment_reads')
          .select('last_seen_at')
          .eq('user_id', user.id)
          .eq('lesson_id', lessonId)
          .maybeSingle(),
      );
      return row?.last_seen_at ?? null;
    },

    async markCommentsSeen(lessonId) {
      const {
        data: { user },
      } = await db().auth.getUser();
      if (!user) return;

      const { error } = await db()
        .from('lesson_comment_reads')
        .upsert(
          { user_id: user.id, lesson_id: lessonId, last_seen_at: new Date().toISOString() },
          { onConflict: 'user_id,lesson_id' },
        );
      if (error) throw new Error(error.message);
    },

    async getModuleQuiz(moduleId) {
      const { data: quiz, error } = await db()
        .from('quizzes')
        .select('id, module_id, passing_score')
        .eq('module_id', moduleId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!quiz) return null;

      const { count } = await db()
        .from('quiz_questions')
        .select('id', { count: 'exact', head: true })
        .eq('quiz_id', quiz.id);

      return {
        id: quiz.id,
        moduleId: quiz.module_id,
        passingScore: quiz.passing_score,
        questionCount: count ?? 0,
      };
    },

    async listMyQuizAttempts(quizId) {
      const rows = unwrap(
        await db()
          .from('quiz_attempts')
          .select('id, score, passed, created_at')
          .eq('quiz_id', quizId)
          .order('created_at', { ascending: false }),
      );
      return rows.map((row) => ({
        id: row.id,
        score: row.score,
        passed: row.passed,
        createdAt: row.created_at,
      }));
    },

    async listCourseThreads(courseId) {
      const threads = unwrap<Row<'course_threads'>[]>(
        await db()
          .from('course_threads')
          .select('*')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false }),
      );
      if (threads.length === 0) return [];

      const authorIds = [...new Set(threads.map((t) => t.author_id))];
      const profiles = unwrap<Pick<Row<'profiles'>, 'id' | 'full_name' | 'role'>[]>(
        await db().from('profiles').select('id, full_name, role').in('id', authorIds),
      );
      const profileById = new Map(profiles.map((p) => [p.id, p]));

      const replies = unwrap<Pick<Row<'course_thread_replies'>, 'thread_id'>[]>(
        await db()
          .from('course_thread_replies')
          .select('thread_id')
          .in('thread_id', threads.map((t) => t.id)),
      );
      const replyCountByThread = new Map<string, number>();
      for (const reply of replies) {
        replyCountByThread.set(reply.thread_id, (replyCountByThread.get(reply.thread_id) ?? 0) + 1);
      }

      return threads.map((t) => {
        const author = profileById.get(t.author_id);
        return {
          id: t.id,
          courseId: t.course_id,
          authorId: t.author_id,
          authorName: author?.full_name ?? 'Alguien',
          fromStaff: author ? isStaff(author.role as UserRole) : false,
          title: t.title,
          body: t.body,
          createdAt: t.created_at,
          replyCount: replyCountByThread.get(t.id) ?? 0,
        };
      });
    },

    async getCourseThread(threadId) {
      const { data: t } = await db().from('course_threads').select('*').eq('id', threadId).maybeSingle();
      if (!t) return null;

      const profile = unwrap<Pick<Row<'profiles'>, 'full_name' | 'role'>>(
        await db().from('profiles').select('full_name, role').eq('id', t.author_id).single(),
      );
      const { count } = await db()
        .from('course_thread_replies')
        .select('id', { count: 'exact', head: true })
        .eq('thread_id', threadId);

      return {
        id: t.id,
        courseId: t.course_id,
        authorId: t.author_id,
        authorName: profile.full_name,
        fromStaff: isStaff(profile.role as UserRole),
        title: t.title,
        body: t.body,
        createdAt: t.created_at,
        replyCount: count ?? 0,
      };
    },

    async listThreadReplies(threadId) {
      const replies = unwrap<Row<'course_thread_replies'>[]>(
        await db()
          .from('course_thread_replies')
          .select('*')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true }),
      );
      if (replies.length === 0) return [];

      const authorIds = [...new Set(replies.map((r) => r.author_id))];
      const profiles = unwrap<Pick<Row<'profiles'>, 'id' | 'full_name' | 'role'>[]>(
        await db().from('profiles').select('id, full_name, role').in('id', authorIds),
      );
      const profileById = new Map(profiles.map((p) => [p.id, p]));

      return replies.map((r) => {
        const author = profileById.get(r.author_id);
        return {
          id: r.id,
          threadId: r.thread_id,
          authorId: r.author_id,
          authorName: author?.full_name ?? 'Alguien',
          fromStaff: author ? isStaff(author.role as UserRole) : false,
          body: r.body,
          createdAt: r.created_at,
        };
      });
    },

    async createCourseThread(courseId, title, body) {
      const {
        data: { user },
      } = await db().auth.getUser();
      if (!user) throw new Error('No autenticado');

      const row = unwrap<Row<'course_threads'>>(
        await db()
          .from('course_threads')
          .insert({ course_id: courseId, author_id: user.id, title, body })
          .select()
          .single(),
      );
      const profile = unwrap<Pick<Row<'profiles'>, 'full_name' | 'role'>>(
        await db().from('profiles').select('full_name, role').eq('id', user.id).single(),
      );

      return {
        id: row.id,
        courseId: row.course_id,
        authorId: row.author_id,
        authorName: profile.full_name,
        fromStaff: isStaff(profile.role as UserRole),
        title: row.title,
        body: row.body,
        createdAt: row.created_at,
        replyCount: 0,
      };
    },

    async addThreadReply(threadId, body) {
      const {
        data: { user },
      } = await db().auth.getUser();
      if (!user) throw new Error('No autenticado');

      const row = unwrap<Row<'course_thread_replies'>>(
        await db()
          .from('course_thread_replies')
          .insert({ thread_id: threadId, author_id: user.id, body })
          .select()
          .single(),
      );
      const profile = unwrap<Pick<Row<'profiles'>, 'full_name' | 'role'>>(
        await db().from('profiles').select('full_name, role').eq('id', user.id).single(),
      );

      return {
        id: row.id,
        threadId: row.thread_id,
        authorId: row.author_id,
        authorName: profile.full_name,
        fromStaff: isStaff(profile.role as UserRole),
        body: row.body,
        createdAt: row.created_at,
      };
    },

    async deleteCourseThread(threadId) {
      const { error } = await db().from('course_threads').delete().eq('id', threadId);
      if (error) throw new Error(error.message);
    },

    async deleteThreadReply(replyId) {
      const { error } = await db().from('course_thread_replies').delete().eq('id', replyId);
      if (error) throw new Error(error.message);
    },

    async getMyCourseRating(courseId) {
      const {
        data: { user },
      } = await db().auth.getUser();
      if (!user) return null;

      const { data } = await db()
        .from('course_ratings')
        .select('stars, review')
        .eq('course_id', courseId)
        .eq('student_id', user.id)
        .maybeSingle();
      if (!data) return null;
      return { stars: data.stars, review: data.review };
    },

    async submitCourseRating(courseId, stars, review) {
      const {
        data: { user },
      } = await db().auth.getUser();
      if (!user) throw new Error('No autenticado');

      const { error } = await db()
        .from('course_ratings')
        .upsert(
          { course_id: courseId, student_id: user.id, stars, review: review || null, updated_at: new Date().toISOString() },
          { onConflict: 'course_id,student_id' },
        );
      if (error) throw new Error(error.message);
    },

    async listMyAssignments(courseId) {
      const modules = unwrap(
        await db().from('modules').select('id').eq('course_id', courseId),
      );
      if (modules.length === 0) return [];

      const rows = unwrap<Row<'assignments'>[]>(
        await db()
          .from('assignments')
          .select('*')
          .in('module_id', modules.map((m) => m.id))
          .order('due_at'),
      );
      return rows.map(toAssignment);
    },

    async getMySubmission(assignmentId) {
      const {
        data: { user },
      } = await db().auth.getUser();
      if (!user) return null;

      const { data: row, error } = await db()
        .from('assignment_submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return row ? toAssignmentSubmission(row) : null;
    },

    async submitAssignment(assignmentId, input) {
      const {
        data: { user },
      } = await db().auth.getUser();
      if (!user) throw new Error('No autenticado');

      // Chequeo previo por un mensaje claro — RLS igual lo rechazaría, pero
      // con un error genérico de Postgres en vez de este texto.
      const assignment = unwrap<Pick<Row<'assignments'>, 'due_at'>>(
        await db().from('assignments').select('due_at').eq('id', assignmentId).single(),
      );
      if (!canStudentSubmit({ dueAt: assignment.due_at, gradedAt: null }, new Date())) {
        throw new Error('La fecha límite de esta tarea ya venció');
      }

      const row = unwrap<Row<'assignment_submissions'>>(
        await db()
          .from('assignment_submissions')
          .insert({
            assignment_id: assignmentId,
            student_id: user.id,
            kind: input.kind,
            media_key: input.mediaKey,
            file_name: input.fileName,
          })
          .select('*')
          .single(),
      );
      return toAssignmentSubmission(row);
    },

    async deleteMySubmission(submissionId) {
      const submission = unwrap<Row<'assignment_submissions'>>(
        await db().from('assignment_submissions').select('*').eq('id', submissionId).single(),
      );
      const assignment = unwrap<Pick<Row<'assignments'>, 'due_at'>>(
        await db().from('assignments').select('due_at').eq('id', submission.assignment_id).single(),
      );
      if (!canStudentDelete({ dueAt: assignment.due_at, gradedAt: submission.graded_at }, new Date())) {
        throw new Error('Esta entrega ya no se puede borrar (venció o fue calificada)');
      }

      const { error } = await db().from('assignment_submissions').delete().eq('id', submissionId);
      if (error) throw new Error(error.message);
    },

    async getMyNotifications() {
      const empty = {
        dueSoon: { count: 0, urgent: false, target: null },
        newAssignments: { count: 0, target: null },
        graded: { count: 0, target: null },
      } as const;

      const {
        data: { user },
      } = await db().auth.getUser();
      if (!user) return empty;

      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const in1Day = new Date(nowMs + 24 * 60 * 60 * 1000).toISOString();
      const in3Days = new Date(nowMs + 3 * 24 * 60 * 60 * 1000).toISOString();
      const recentWindow = new Date(nowMs - 3 * 24 * 60 * 60 * 1000).toISOString();

      // RLS de `assignments` ya restringe esto a los módulos con acceso
      // otorgado al alumno autenticado — ver "alumno ve tareas de sus
      // módulos con acceso" en 0036_assignments.sql.
      const { data: assignmentRows, error: assignmentsError } = await db()
        .from('assignments')
        .select('id, module_id, due_at, created_at, modules(course_id)');
      if (assignmentsError) throw new Error(assignmentsError.message);
      const assignments = (assignmentRows ?? []) as unknown as {
        id: string;
        module_id: string;
        due_at: string;
        created_at: string;
        modules: { course_id: string } | null;
      }[];

      const mySubmissions = unwrap<Pick<Row<'assignment_submissions'>, 'assignment_id' | 'graded_at'>[]>(
        await db().from('assignment_submissions').select('assignment_id, graded_at').eq('student_id', user.id),
      );
      const submittedIds = new Set(mySubmissions.map((s) => s.assignment_id));

      const target = (a: { module_id: string; id: string; modules: { course_id: string } | null }) =>
        a.modules ? { courseId: a.modules.course_id, moduleId: a.module_id, assignmentId: a.id } : null;

      const dueSoonList = assignments.filter(
        (a) => !submittedIds.has(a.id) && a.due_at > nowIso && a.due_at <= in3Days,
      );
      const newList = assignments.filter((a) => !submittedIds.has(a.id) && a.created_at >= recentWindow);
      const gradedList = mySubmissions.filter((s) => s.graded_at !== null && s.graded_at >= recentWindow);

      const oldestDueSoon = [...dueSoonList].sort((a, b) => a.due_at.localeCompare(b.due_at))[0];
      const newestNew = [...newList].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      const newestGraded = [...gradedList].sort((a, b) => b.graded_at!.localeCompare(a.graded_at!))[0];
      const gradedAssignment = newestGraded
        ? assignments.find((a) => a.id === newestGraded.assignment_id)
        : undefined;

      return {
        dueSoon: {
          count: dueSoonList.length,
          urgent: dueSoonList.some((a) => a.due_at <= in1Day),
          target: oldestDueSoon ? target(oldestDueSoon) : null,
        },
        newAssignments: {
          count: newList.length,
          target: newestNew ? target(newestNew) : null,
        },
        graded: {
          count: gradedList.length,
          target: gradedAssignment ? target(gradedAssignment) : null,
        },
      };
    },
  },

  practice: {
    async getSession(): Promise<PracticeSession> {
      const response = await fetch('/api/practice/session');
      if (!response.ok) throw new Error('No se pudo cargar la sesión de práctica');
      return response.json();
    },
    async listLevels() {
      const response = await fetch('/api/practice/levels');
      if (!response.ok) throw new Error('No se pudieron cargar los niveles');
      return response.json();
    },
    async getQuestion(step) {
      const response = await fetch(`/api/practice/question?step=${step}`);
      if (!response.ok) throw new Error('No se pudo cargar el ejercicio');
      return response.json();
    },
    async submitAnswer(questionId, optionIds) {
      const response = await fetch('/api/practice/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, optionIds }),
      });
      if (!response.ok) throw new Error('No se pudo comprobar la respuesta');
      return response.json();
    },
    async advance() {
      const response = await fetch('/api/practice/advance', { method: 'POST' });
      if (!response.ok) throw new Error('No se pudo avanzar');
      return response.json();
    },

    async adminListQuestions() {
      const response = await fetch('/api/practice-questions');
      if (!response.ok) throw new Error('No se pudieron cargar las preguntas');
      const { questions } = (await response.json()) as { questions: PracticeQuestionAdmin[] };
      return questions;
    },
    async adminCreateQuestion(input) {
      const response = await fetch('/api/practice-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: 'No se pudo crear la pregunta' }));
        throw new Error(error ?? 'No se pudo crear la pregunta');
      }
      return response.json();
    },
    async adminUpdateQuestion(id, input) {
      const response = await fetch(`/api/practice-questions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: 'No se pudo actualizar la pregunta' }));
        throw new Error(error ?? 'No se pudo actualizar la pregunta');
      }
      return response.json();
    },
    async adminDeleteQuestion(id) {
      const response = await fetch(`/api/practice-questions/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('No se pudo eliminar la pregunta');
    },
  },

  storage: {
    async getUsage() {
      const response = await fetch('/api/storage/usage');
      if (!response.ok) throw new Error('No se pudo cargar el uso de almacenamiento');
      return response.json();
    },
  },

  quiz: {
    // Autoría de docente: `is_correct` viaja tal cual porque quien llama
    // esto ya pasó la política "docentes gestionan opciones" (is_staff()).
    async getQuizDraft(moduleId) {
      const { data: quiz, error } = await db()
        .from('quizzes')
        .select('id, passing_score')
        .eq('module_id', moduleId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!quiz) return null;

      const questions = unwrap(
        await db()
          .from('quiz_questions')
          .select('id, prompt, position')
          .eq('quiz_id', quiz.id)
          .order('position'),
      );
      const options = unwrap(
        await db()
          .from('quiz_options')
          .select('id, question_id, label, is_correct, position')
          .in('question_id', questions.map((q) => q.id))
          .order('position'),
      );

      return {
        passingScore: quiz.passing_score,
        questions: questions.map((question) => ({
          prompt: question.prompt,
          options: options
            .filter((option) => option.question_id === question.id)
            .map((option) => ({ label: option.label, isCorrect: option.is_correct })),
        })),
      };
    },

    // Reemplazo completo: más simple y menos propenso a errores que hacer
    // diff de qué pregunta/opción cambió — un quiz de módulo tiene pocas
    // preguntas, no hay costo real en borrar y reinsertar todo cada vez.
    async saveQuizDraft(moduleId, draft) {
      const { data: existing } = await db()
        .from('quizzes')
        .select('id')
        .eq('module_id', moduleId)
        .maybeSingle();

      const quizId =
        existing?.id ??
        unwrap<Pick<Row<'quizzes'>, 'id'>>(
          await db()
            .from('quizzes')
            .insert({ module_id: moduleId, passing_score: draft.passingScore })
            .select('id')
            .single(),
        ).id;

      if (existing) {
        const { error } = await db()
          .from('quizzes')
          .update({ passing_score: draft.passingScore })
          .eq('id', quizId);
        if (error) throw new Error(error.message);

        const oldQuestions = unwrap(
          await db().from('quiz_questions').select('id').eq('quiz_id', quizId),
        );
        if (oldQuestions.length > 0) {
          const { error: deleteError } = await db()
            .from('quiz_questions')
            .delete()
            .in('id', oldQuestions.map((q) => q.id));
          if (deleteError) throw new Error(deleteError.message);
        }
      }

      for (const [index, question] of draft.questions.entries()) {
        const insertedQuestion = unwrap<Pick<Row<'quiz_questions'>, 'id'>>(
          await db()
            .from('quiz_questions')
            .insert({ quiz_id: quizId, prompt: question.prompt, position: index })
            .select('id')
            .single(),
        );
        const { error: optionsError } = await db()
          .from('quiz_options')
          .insert(
            question.options.map((option, optionIndex) => ({
              question_id: insertedQuestion.id,
              label: option.label,
              is_correct: option.isCorrect,
              position: optionIndex,
            })),
          );
        if (optionsError) throw new Error(optionsError.message);
      }
    },

    async removeQuiz(moduleId) {
      const { error } = await db().from('quizzes').delete().eq('module_id', moduleId);
      if (error) throw new Error(error.message);
    },
  },

  assignments: {
    async listAssignments(moduleId) {
      const rows = unwrap<Row<'assignments'>[]>(
        await db().from('assignments').select('*').eq('module_id', moduleId).order('position'),
      );
      return rows.map(toAssignment);
    },

    async createAssignment(input: CreateAssignmentInput) {
      const {
        data: { user },
      } = await db().auth.getUser();
      if (!user) throw new Error('No autenticado');

      const { count } = await db()
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('module_id', input.moduleId);

      const row = unwrap<Row<'assignments'>>(
        await db()
          .from('assignments')
          .insert({
            module_id: input.moduleId,
            title: input.title,
            instructions: input.instructions,
            due_at: input.dueAt,
            media_key: input.attachment?.mediaKey ?? null,
            file_name: input.attachment?.fileName ?? null,
            created_by: user.id,
            position: count ?? 0,
          })
          .select('*')
          .single(),
      );
      return toAssignment(row);
    },

    async updateAssignment(id, input) {
      // `attachment === undefined` = no tocar el adjunto existente;
      // `null` = quitarlo explícitamente; objeto = reemplazarlo. Antes
      // `input.attachment ? {...} : {}` trataba `null` igual que
      // `undefined` — clic en "Quitar" no persistía, el `media_key` viejo
      // seguía sirviéndose a los alumnos.
      const row = unwrap<Row<'assignments'>>(
        await db()
          .from('assignments')
          .update({
            title: input.title,
            instructions: input.instructions,
            due_at: input.dueAt,
            ...(input.attachment !== undefined
              ? {
                  media_key: input.attachment?.mediaKey ?? null,
                  file_name: input.attachment?.fileName ?? null,
                }
              : {}),
          })
          .eq('id', id)
          .select('*')
          .single(),
      );
      return toAssignment(row);
    },

    async removeAssignment(id) {
      const { error } = await db().from('assignments').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },

    async moveAssignment(moduleId, assignmentId, direction) {
      const assignments = await supabaseBackend.assignments.listAssignments(moduleId);
      const from = assignments.findIndex((a) => a.id === assignmentId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= assignments.length) return assignments;

      const a = assignments[from]!;
      const b = assignments[to]!;
      const { error } = await db().rpc('swap_assignment_position', {
        assignment_a_id: a.id,
        assignment_b_id: b.id,
      });
      if (error) throw new Error(error.message);
      return supabaseBackend.assignments.listAssignments(moduleId);
    },

    async listSubmissionsForModule(moduleId) {
      const assignments = unwrap<Pick<Row<'assignments'>, 'id'>[]>(
        await db().from('assignments').select('id').eq('module_id', moduleId),
      );
      if (assignments.length === 0) return [];

      const rows = unwrap<Row<'assignment_submissions'>[]>(
        await db()
          .from('assignment_submissions')
          .select('*')
          .in('assignment_id', assignments.map((a) => a.id))
          .order('submitted_at', { ascending: false }),
      );
      if (rows.length === 0) return [];

      const studentIds = [...new Set(rows.map((r) => r.student_id))];
      const profiles = unwrap<Pick<Row<'profiles'>, 'id' | 'full_name'>[]>(
        await db().from('profiles').select('id, full_name').in('id', studentIds),
      );
      const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));

      return rows.map((row) => toAssignmentSubmission(row, nameById.get(row.student_id)));
    },

    async gradeSubmission(submissionId, grade, feedback) {
      const {
        data: { user },
      } = await db().auth.getUser();
      if (!user) throw new Error('No autenticado');

      const row = unwrap<Row<'assignment_submissions'>>(
        await db()
          .from('assignment_submissions')
          .update({
            grade,
            feedback: feedback || null,
            graded_at: new Date().toISOString(),
            graded_by: user.id,
          })
          .eq('id', submissionId)
          .select('*')
          .single(),
      );
      return toAssignmentSubmission(row);
    },

    async getUngradedCount() {
      const response = await fetch('/api/assignments/ungraded-count');
      if (!response.ok) return { count: 0, target: null };
      return (await response.json()) as {
        count: number;
        target: { courseId: string; moduleId: string; assignmentId: string } | null;
      };
    },
  },

  account: {
    async updateProfile(fullName) {
      const {
        data: { user },
      } = await db().auth.getUser();
      if (!user) throw new Error('No autenticado');

      const { error } = await db().from('profiles').update({ full_name: fullName }).eq('id', user.id);
      if (error) throw new Error(error.message);
    },

    async changePassword(newPassword) {
      const { error } = await db().auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
    },
  },

  staff: {
    async list() {
      const response = await fetch('/api/staff');
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'No se pudo cargar el equipo');
      }
      const { staff } = (await response.json()) as { staff: StaffMember[] };
      return staff;
    },

    async invite(input) {
      const response = await fetch('/api/staff/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'No se pudo invitar al administrador');
      }
      return (await response.json()) as { email: string };
    },

    async setActive(id, active) {
      const response = await fetch(`/api/staff/${id}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'No se pudo cambiar el estado');
      }

      const staffList = await supabaseBackend.staff.list();
      const found = staffList.find((s) => s.id === id);
      if (!found) throw new Error('Miembro del staff no encontrado');
      return found;
    },

    async remove(id) {
      const response = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'No se pudo eliminar al miembro del staff');
      }
    },
  },

  audit: {
    async list(page) {
      const response = await fetch(`/api/audit?page=${page}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'No se pudo cargar la actividad');
      }
      const { items, hasMore } = (await response.json()) as {
        items: Array<{
          id: string;
          actor_name: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          entity_label: string | null;
          created_at: string;
        }>;
        hasMore: boolean;
      };
      return {
        items: items.map((row) => ({
          id: row.id,
          actorName: row.actor_name,
          action: row.action,
          entityType: row.entity_type,
          entityId: row.entity_id,
          entityLabel: row.entity_label,
          createdAt: row.created_at,
        })),
        hasMore,
      };
    },
  },
};

/** Referencia usada por los Route Handlers de práctica. */
export const PRACTICE_FALLBACK_QUESTION = DEMO_QUESTION;
