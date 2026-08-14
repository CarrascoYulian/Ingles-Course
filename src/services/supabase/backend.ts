import { inferBlockType } from '@/features/content/infer-block-type';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { DEMO_QUESTION } from '../demo/data';
import type { AttachUploadInput, Backend } from '../ports';
import { toContentBlock, toCourse, toLesson, toModule, toStudentSummary } from './mappers';
import type { Course, PracticeSession, ReportRange } from '@/types';
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

/** Mismo bucket que `src/lib/storage.ts` — no se puede importar ese módulo
 * aquí porque está marcado `server-only` y este adaptador corre en el
 * navegador bajo RLS. */
const STORAGE_BUCKET = 'course-files';

/**
 * Borra objetos de Storage lo mejor que puede: si Storage falla, no aborta
 * el flujo que la llamó (la fila en Postgres ya se borró o está por
 * borrarse). El objeto que quede huérfano lo recoge el job de
 * reconciliación semanal — no bloquear la UI del docente por un error
 * transitorio de Storage es preferible a arriesgar una fila que no se puede
 * volver a borrar desde la interfaz.
 */
async function removeStorageObjects(mediaKeys: string[]): Promise<void> {
  const keys = mediaKeys.filter((key): key is string => Boolean(key));
  if (keys.length === 0) return;
  const { error } = await db().storage.from(STORAGE_BUCKET).remove(keys);
  if (error) console.error('No se pudieron borrar objetos de Storage', error);
}

/** Todas las claves de archivo que cuelgan de un curso, vía sus módulos. */
async function collectCourseMediaKeys(courseId: string): Promise<string[]> {
  const { data: modules } = await db().from('modules').select('id').eq('course_id', courseId);
  const moduleIds = (modules ?? []).map((row) => row.id);
  if (moduleIds.length === 0) return [];

  const { data } = await db()
    .from('content_blocks')
    .select('media_key')
    .in('module_id', moduleIds)
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
    .from('content_blocks')
    .select('position')
    .eq('module_id', moduleId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? -1) + 1;
}

async function nextLessonPosition(moduleId: string): Promise<number> {
  const { data } = await db()
    .from('lessons')
    .select('position')
    .eq('module_id', moduleId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? -1) + 1;
}

async function nextResourcePosition(courseId: string): Promise<number> {
  const { data } = await db()
    .from('course_resources')
    .select('position')
    .eq('course_id', courseId)
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

    async remove(id) {
      // Igual que en `removeBlock`: hay que leer las claves antes de borrar,
      // porque el cascade de Postgres se lleva `modules` → `content_blocks`
      // en el mismo statement y después ya no queda nada que consultar.
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
      // RPC atómico — mismo patrón que `swap_content_block_position`: dos
      // updates independientes no son atómicos y podían dejar dos cursos
      // con la misma posición si uno fallaba a mitad de camino.
      const { error } = await db().rpc('swap_course_position', {
        course_a_id: a.id,
        course_b_id: b.id,
      });
      if (error) throw new Error(error.message);
      return supabaseBackend.courses.list();
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

    async listBlocks(moduleId) {
      const rows = unwrap(
        await db()
          .from('content_blocks')
          .select('*')
          .eq('module_id', moduleId)
          .order('position', { ascending: true }),
      );
      return rows.map(toContentBlock);
    },

    async addBlock(moduleId, type) {
      const position = await nextBlockPosition(moduleId);

      const row = unwrap<Row<'content_blocks'>>(
        await db()
          .from('content_blocks')
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
      return toContentBlock(row);
    },

    async moveBlock(moduleId, blockId, direction) {
      const blocks = await supabaseBackend.content.listBlocks(moduleId);
      const from = blocks.findIndex((b) => b.id === blockId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= blocks.length) return blocks;

      const a = blocks[from]!;
      const b = blocks[to]!;
      // RPC atómico en vez de dos updates independientes: si uno fallara a
      // mitad de camino, dos bloques podían terminar con la misma `position`.
      const { error } = await db().rpc('swap_content_block_position', {
        block_a_id: a.id,
        block_b_id: b.id,
      });
      if (error) throw new Error(error.message);
      return supabaseBackend.content.listBlocks(moduleId);
    },

    async removeBlock(blockId) {
      // Se lee el `media_key` antes de borrar la fila: una vez borrada, ya
      // no hay forma de saber qué objeto de Storage le correspondía.
      const { data: block } = await db()
        .from('content_blocks')
        .select('media_key')
        .eq('id', blockId)
        .maybeSingle();

      const { error } = await db().from('content_blocks').delete().eq('id', blockId);
      if (error) throw new Error(error.message);

      if (block?.media_key) await removeStorageObjects([block.media_key]);
    },

    async attachUpload(input: AttachUploadInput) {
      const position = await nextBlockPosition(input.moduleId);
      const type = inferBlockType(input.contentType);

      const {
        data: { user },
      } = await db().auth.getUser();

      const row = unwrap<Row<'content_blocks'>>(
        await db()
          .from('content_blocks')
          .insert({
            module_id: input.moduleId,
            type,
            title: input.fileName,
            meta: input.sizeLabel,
            position,
            media_key: input.mediaKey,
            uploaded_by: user?.id ?? null,
          })
          .select()
          .single(),
      );

      // `content_blocks` sólo alimenta este panel de administración — el
      // reproductor del alumno lee `lessons` y "Recursos" lee
      // `course_resources`, dos tablas completamente separadas. Sin este
      // paso, un archivo subido aquí nunca llegaba a verse del lado del
      // alumno aunque ya estuviera matriculado.
      const title = input.fileName.replace(/\.[^.]+$/, '');
      if (type === 'Video') {
        const lessonPosition = await nextLessonPosition(input.moduleId);
        const durationSeconds = input.durationSeconds ? Math.round(input.durationSeconds) : 0;
        await db()
          .from('lessons')
          .insert({
            module_id: input.moduleId,
            position: lessonPosition,
            title,
            media_key: input.mediaKey,
            // `duration_minutes` sigue existiendo por compatibilidad; la
            // fuente real de verdad ahora es `duration_seconds`, sin redondear
            // hacia arriba a un mínimo inventado.
            duration_minutes: Math.round(durationSeconds / 60),
            duration_seconds: durationSeconds,
            description: null,
          });
      } else {
        const moduleRow = unwrap<Pick<Row<'modules'>, 'course_id'>>(
          await db().from('modules').select('course_id').eq('id', input.moduleId).single(),
        );
        const resourcePosition = await nextResourcePosition(moduleRow.course_id);
        await db()
          .from('course_resources')
          .insert({
            course_id: moduleRow.course_id,
            type: type === 'Audio' ? 'MP3' : 'PDF',
            title,
            meta: input.sizeLabel,
            media_key: input.mediaKey,
            position: resourcePosition,
          });
      }

      return toContentBlock(row);
    },

    async getFileUrl(mediaKey) {
      const response = await fetch(`/api/media?key=${encodeURIComponent(mediaKey)}`);
      if (!response.ok) return null;
      const { url } = (await response.json()) as { url: string };
      return url;
    },

    async updateLesson(lessonId, input) {
      const { data: lesson, error } = await db()
        .from('lessons')
        .update({ title: input.title, description: input.description || null })
        .eq('id', lessonId)
        .select('media_key')
        .single();
      if (error) throw new Error(error.message);

      // `content_blocks` (la fila del constructor) y `lessons` (lo que ve el
      // alumno) son tablas separadas sin llave foránea — sin este segundo
      // update, el título quedaba "actualizado" para el alumno pero seguía
      // mostrando el nombre del archivo original en el panel del docente.
      if (lesson.media_key) {
        await db().from('content_blocks').update({ title: input.title }).eq('media_key', lesson.media_key);
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

    async enroll(studentId, courseId) {
      const { error } = await db()
        .from('enrollments')
        .upsert(
          { student_id: studentId, course_id: courseId, progress: 0, watched_minutes: 0, completed_lessons: 0 },
          { onConflict: 'student_id,course_id', ignoreDuplicates: true },
        );
      if (error) throw new Error(error.message);

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

    async sendMessage(id, body) {
      const response = await fetch('/api/students/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: id, body }),
      });
      if (!response.ok) throw new Error('No se pudo enviar el mensaje');
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
    async getLeaderboard() {
      const response = await fetch('/api/analytics/leaderboard');
      if (!response.ok) throw new Error('No se pudo cargar el ranking');
      return response.json();
    },
    async getReport(range: ReportRange) {
      const response = await fetch(`/api/analytics/report?range=${encodeURIComponent(range)}`);
      if (!response.ok) throw new Error('No se pudo cargar el reporte');
      return response.json();
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
      // Antes ignoraba por completo de qué curso venía la petición y
      // devolvía el primer módulo de TODA la base — con más de un curso, un
      // alumno matriculado sólo en el curso B podía ver contenido del curso
      // A. Ahora se filtra por el curso real del alumno.
      const rows = unwrap(
        await db().from('modules').select('*').eq('course_id', courseId).order('position').limit(1),
      );
      return rows[0] ? toModule(rows[0]) : null;
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

      let previousCompleted = true;
      return rows.map((row) => {
        const lesson = toLesson(row, byLesson.get(row.id), previousCompleted);
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

    async listResources() {
      const response = await fetch('/api/resources');
      if (!response.ok) throw new Error('No se pudieron cargar los recursos');
      return response.json();
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

    async getMyProgress() {
      const {
        data: { user },
      } = await db().auth.getUser();

      const empty = { percent: 0, level: 'A1' as const, hoursStudied: 0, lessonsCompleted: 0, badgesEarned: 0 };
      if (!user) return empty;

      const [profileResult, enrollmentResult, badgesResult] = await Promise.all([
        db().from('profiles').select('level').eq('id', user.id).single(),
        db()
          .from('enrollments')
          .select('progress, watched_minutes, completed_lessons')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
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
        .insert({ sender_id: user.id, student_id: user.id, body, read_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
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
    async submitAnswer(questionId, optionId) {
      const response = await fetch('/api/practice/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, optionId }),
      });
      if (!response.ok) throw new Error('No se pudo comprobar la respuesta');
      return response.json();
    },
    async advance() {
      const response = await fetch('/api/practice/advance', { method: 'POST' });
      if (!response.ok) throw new Error('No se pudo avanzar');
      return response.json();
    },
  },

  storage: {
    async getUsage() {
      const response = await fetch('/api/storage/usage');
      if (!response.ok) throw new Error('No se pudo cargar el uso de almacenamiento');
      return response.json();
    },
  },
};

/** Referencia usada por los Route Handlers de práctica. */
export const PRACTICE_FALLBACK_QUESTION = DEMO_QUESTION;
