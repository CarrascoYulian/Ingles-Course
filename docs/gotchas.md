# Gotchas — trampas encontradas

## Storage: widget y limpieza

El widget de sidebar "Almacenamiento" del panel admin (issue #39) no existía en el código pese a que el diseño lo daba por hecho — se construyó desde cero (`src/components/admin/storage-usage-widget.tsx`). Además del total, muestra los 3 cursos que más pesan (`StorageUsage.byCourse`, calculado en `/api/storage/usage` a partir del propio prefijo `cursos/{courseId}/...` del `media_key`, sin cruzar contra Postgres).

Si "borrar" algo con archivo real no hace bajar el uso del widget al instante, sospechar primero de llamadas directas a `db().storage.from('course-files').remove()` en lugar de pasar por `/api/storage/delete` — ese patrón quedó de un refactor anterior y no lanza error visible.

## Auth: login y sesión

- `/login` redirige directo al panel si ya hay sesión activa (cookie de Supabase Auth) — es el comportamiento esperado del middleware (`src/middleware.ts`), no una falla de autenticación.
- Para probar el formulario de login de verdad, hace falta una sesión limpia (sin cookies).
- No hay forma de loguearse en el navegador sin contraseña.
  - Para verificar UI sin credenciales: levanta una página temporal fuera de `PROTECTED_PREFIXES` (`src/constants/routes.ts`), o comenta temporalmente `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` en `.env.local` para forzar modo demo (**recordar restaurar después**).

## Panel admin: vistas de datos

- `/admin` (dashboard general): **solo KPIs agregados** — el docente no puede ver el rendimiento de un alumno individual ahí.
- `/admin/reportes`: vista individual (calificaciones acumuladas de `quiz_attempts` por alumno) — **solo ahí**.
- `/admin/estudiantes`: gestión de matrícula, muestra progreso individual — **no es reportería**.
- **No confundir** los tres espacios.

## Panel admin: Suspense

Ninguna página bajo `/admin/*` necesita su propio `<Suspense>` para `useSearchParams()` — `AdminShell` ya envuelve `AdminTopbar` (que también usa `useSearchParams`) en uno, y ese límite cubre toda la ruta.

Agregar un segundo `<Suspense>` anidado localmente (como tenía `estudiantes/page.tsx`) deja ese sub-árbol colgado en el placeholder de streaming de RSC — nunca hidrata en el cliente, sin error visible en consola ni en la red.

**Si una página del panel se queda pegada en su estado de carga inicial para siempre**, comprobar primero si tiene un `<Suspense>` propio de más.

## Publicación de cursos

Publicar un curso con una unidad vacía o sin evaluación **no está bloqueado** — solo avisa (`CoursesPort.getPublishWarnings`, confirmación en `courses-view.tsx`) y deja publicar igual.

**No confundir** con un chequeo obligatorio: un curso sólo de lectura sin evaluación es un caso válido.
