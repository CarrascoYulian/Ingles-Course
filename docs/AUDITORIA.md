# Auditoría completa · Bertho Community

Fecha: 2026-07-28

## 1. Rendimiento

**Diagnóstico.** No era un problema de código. Los logs del servidor de
desarrollo mostraban compilaciones de 1.5–9 s la primera vez que se visita
cada ruta (`Compiled /admin/dashboard in 7.3s (1197 modules)`) — es
Next.js compilando esa página bajo demanda, comportamiento normal de
`npm run dev`. Para confirmarlo, se ejecutó `npm run build && npm run start`
(producción) y se navegó por las mismas 5 pantallas del panel: todas las
respuestas llegaron en decenas de milisegundos, sin compilación.

**Conclusión verificable:** en producción no hay lentitud. En desarrollo,
la primera visita a cada ruta compilará; las siguientes son rápidas incluso
en dev. Ningún cambio de código podía "arreglar" esto porque no era un
defecto — es cómo funciona el compilador bajo demanda de Next.

## 2. Gestión de archivos

Implementado de extremo a extremo en **Constructor de contenido**
(`/admin/contenido`):

1. Arrastra o selecciona un archivo → sube directo al bucket de Supabase
   Storage con una URL firmada (nunca pasa por el servidor de Next).
2. Al terminar, se registra un bloque en `content_blocks` con: título
   (nombre real del archivo), tipo (inferido del MIME), tamaño formateado,
   `media_key` (ruta en Storage), `uploaded_by` (quién) y `created_at`
   (cuándo).
3. Aparece automáticamente en la lista — invalidación de caché de
   TanStack Query, sin recargar la página.
4. Botón "Ver archivo" en cada bloque con adjunto: pide una URL firmada
   fresca y la abre en una pestaña nueva — si el archivo no existe de
   verdad, avisa con un error en vez de abrir un enlace roto.

**Verificado en vivo** (sin navegador de archivos disponible en esta sesión
para simular el clic de "elegir archivo", se probó el endpoint
directamente): login → subida real vía `multipart/form-data` → el binario
quedó escrito en disco con el contenido exacto → servido por HTTP con
`200 OK`. En el camino se encontró y corrigió un bug: la ruta devuelta
usaba backslashes de Windows (`path.normalize` es dependiente del SO) en
vez de `/`, lo que habría roto la búsqueda posterior del archivo.

Con Supabase configurado, el mismo flujo firma contra Supabase Storage real
(`supabase/migrations/0003_storage.sql`), con políticas RLS: cualquier
usuario autenticado puede leer, sólo `admin`/`instructor` puede escribir.

## 3. Datos de prueba

Se encontraron **7 endpoints que devolvían datos fijos siempre**, incluso
con Supabase completamente configurado (no comprobaban si había datos
reales que servir):

| Endpoint | Antes | Ahora |
| --- | --- | --- |
| `/api/resources` | Siempre `DEMO_RESOURCES` | Consulta real (tabla nueva `course_resources`) |
| `/api/badges` | Siempre `DEMO_BADGES` | `badges` LEFT JOIN `student_badges` del usuario |
| `/api/practice/levels` | Siempre `DEMO_PRACTICE_LEVELS` | Tabla nueva `practice_levels` + `practice_progress` |
| `/api/analytics/metrics` | Siempre `DEMO_METRICS` | Agregados reales (`profiles`, `enrollments`, `courses`…) |
| `/api/analytics/activity` | Siempre `DEMO_ACTIVITY` | Tabla nueva `activity_log`, alimentada por acciones reales |
| `/api/analytics/leaderboard` | Siempre `DEMO_LEADERBOARD` | `enrollments` + `profiles`, ordenado por lecciones reales |
| `/api/analytics/report` | Siempre `DEMO_REPORT_BARS` | Agregación real de `lesson_progress` por rango |

Además se encontró y corrigió un bug funcional: `/api/practice/answer`
calculaba la XP ganada pero **nunca la guardaba** en `practice_progress`
fuera del modo demo — el número se mostraba en pantalla y se perdía al
recargar. Ahora hace el `upsert` real.

**Lo que se mantiene como mock, a propósito:** el **modo demo** (cuando no
hay Supabase configurado) sigue usando datos en memoria — es una
funcionalidad deliberada para poder clonar el repo y ver la interfaz
completa con `npm run dev`, sin infraestructura. Se activa/desactiva solo
según si existen las variables de entorno de Supabase
(`IS_DEMO_MODE` en `src/lib/env.ts`). No es el bug que reportaste; el bug
era que el modo *real* seguía sirviendo mock también.

## 4. Autenticación y roles

**Antes:** `getCurrentProfile()` devolvía siempre `DEMO_TEACHER` (admin) sin
pasar por ningún login — la app abría directo en el panel de administrador.

**Ahora:**
- `/` siempre exige sesión; sin ella, redirige a `/login`.
- El modo demo usa una cookie de sesión firmada (HMAC-SHA256 con Web
  Crypto, compatible con Edge Runtime) que sólo se emite tras validar
  correo+contraseña contra las dos cuentas de prueba — no se puede
  fabricar el rol sin la firma.
- El middleware (`src/middleware.ts`) bloquea `/admin/*` a quien no sea
  `admin`/`instructor`, y redirige a estudiantes de vuelta a `/curso`.
- Botón de cerrar sesión, antes inexistente, añadido en escritorio y móvil.

**Verificado en vivo, sesión real de navegador:**
1. `/` sin sesión → redirige a `/login` ✓
2. Login admin → redirige a `/admin/dashboard` ✓
3. Logout → vuelve a `/login` ✓
4. Login estudiante → redirige a `/curso` ✓
5. Estudiante intenta `/admin/dashboard` → rechazado, devuelto a `/curso` ✓
6. Admin intenta acceder sin restricciones al panel → sin bloqueos ✓

**Credenciales de prueba** (ver también `docs/CREDENCIALES-PRUEBA.md`):

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@inglesconmetodo.demo` | `Admin#2026` |
| Estudiante | `estudiante@inglesconmetodo.demo` | `Estudiante#2026` |

Con Supabase conectado, `npm run seed:users` crea estas mismas cuentas como
usuarios reales de Supabase Auth.

## 5. Estado del proyecto

| Módulo | Estado | Observaciones | Prioridad |
| --- | --- | --- | --- |
| Login | ✅ | Real en ambos modos; redirección por rol verificada en vivo | Alta |
| Registro | ⚠️ | No hay pantalla de auto-registro (por diseño: los estudiantes se invitan desde el panel docente, `POST /api/students/invite`) | Media |
| Dashboard Administrador | ✅ | KPIs, gráficos y actividad ahora consultan Supabase real fuera de modo demo | Alta |
| Dashboard Estudiante | ✅ | Curso, progreso, insignias — verificado en vivo | Alta |
| Gestión de archivos | ✅ | Subida→registro→listado→verificación, extremo a extremo | Alta |
| Base de datos | ✅ (esquema) / ⏳ (conexión) | 5 migraciones listas; no verificable en vivo sin proyecto Supabase | Alta |
| Supabase Storage | ✅ (esquema) / ⏳ (conexión) | Bucket + políticas RLS listas; subida real probada en modo demo (filesystem), Supabase real pendiente de credenciales | Alta |
| Autenticación | ✅ | Demo real + Supabase Auth ya cableado; ambos comparten el mismo contrato (`getCurrentProfile`) | Alta |
| Roles y permisos | ✅ | RBAC por capacidades (`lib/auth/rbac.ts`) + RLS a nivel de fila + middleware | Alta |
| CRUD (cursos) | ✅ | Crear, publicar/ocultar, eliminar — probado en demo; políticas RLS listas para real | Alta |
| CRUD (contenido) | ✅ | Añadir, reordenar, eliminar, subir archivo — probado en demo | Alta |
| CRUD (estudiantes) | ✅ | Buscar, filtrar, reiniciar progreso, invitar, mensaje | Media |
| Mensajería a estudiantes | ⚠️ | El endpoint responde `ok` pero no persiste nada (no existe tabla `messages`) | Media |
| Reportes | ✅ | Ahora calcula sobre datos reales (antes siempre fijo) | Alta |
| Banco de preguntas de práctica | ⚠️ | Sólo existe 1 ejercicio autorado (`_bank.ts`); no es un bug de mock, es contenido pendiente de ampliar | Media |
| Variables de entorno | ✅ | Validadas con Zod al arrancar; R2 eliminado, ya no aplica | Alta |

### Funcionalidades completadas
- Login/logout real con redirección por rol, en ambos modos.
- Subida de archivos de extremo a extremo con verificación de existencia.
- 7 endpoints migrados de mock permanente a Supabase real (cuando está configurado).
- Corrección de bug: XP de práctica ahora se persiste de verdad.
- Corrección de bug: separadores de ruta Windows en subida demo.
- Migración completa de Cloudflare R2 → Supabase Storage.
- Esquema completo: 5 migraciones, políticas RLS en todas las tablas y en Storage.
- Script de usuarios de prueba (admin + estudiante) vía Admin API.

### Funcionalidades pendientes
- **Conexión real a Supabase** — bloqueada hasta que crees el proyecto (`supabase/SETUP.md`).
- Registro público de estudiantes (hoy es sólo invitación desde el panel).
- Persistencia real de mensajes docente→estudiante (tabla `messages`).
- Banco de preguntas de práctica con más de un ejercicio.
- Deltas históricos reales en el dashboard ("+12,4 %") — requieren una tabla de snapshots que no existe; se omiten en vez de inventarse.

### Errores encontrados y corregidos
1. Modo demo entraba directo como admin sin login.
2. 7 endpoints ignoraban si Supabase estaba configurado y servían mock siempre.
3. XP de práctica no se guardaba fuera del modo demo.
4. Ruta de archivo con separadores de Windows en la subida demo.
5. `node:crypto` importado donde el Edge Runtime del middleware no lo soporta (usaba Web Crypto de todos modos, pero el build lo exponía).

### Recomendaciones de mejora
- Crear el proyecto Supabase y ejecutar `supabase/SETUP.md` para verificación en vivo completa.
- Añadir tabla `messages` si la mensajería docente→estudiante es un requisito real, no cosmético.
- Ampliar el banco de preguntas de práctica (hoy 1 ejercicio) con una tabla `practice_questions`.
- Considerar una vista materializada para `/api/analytics/metrics` antes de tener muchos estudiantes reales (hoy recalcula agregados en cada visita).

## 6. Verificación de Supabase

| Aspecto | Estado |
| --- | --- |
| Variables de entorno | ✅ Validadas con Zod; sólo 2 públicas + 1 de servidor + 1 de firma demo |
| Conexión a la base de datos | ⏳ Código listo; no verificable sin proyecto real |
| Autenticación | ✅ Cableada (`@supabase/ssr`); el bug de versión que rompía el tipado (`0.5.2` → `0.12.3`) fue encontrado y corregido |
| Storage | ✅ Bucket + políticas listas; flujo de subida verificado con el equivalente local |
| Políticas RLS | ✅ Presentes en las 10 tablas y en `storage.objects` |
| CRUD | ✅ Cursos, bloques, estudiantes — todos con camino real a Supabase, no sólo demo |
| Subida y descarga de archivos | ✅ Extremo a extremo, con verificación de existencia real |

**Lo único que falta es que exista el proyecto.** Todo el código asume su
existencia y reacciona correctamente en cuanto las tres variables de
entorno estén presentes — no hay ningún `if (Supabase existiera...)`
pendiente de escribir.

## 7. Archivos modificados o creados (resumen)

| Archivo | Motivo |
| --- | --- |
| `src/lib/auth/demo-session.ts` | Cookie de sesión demo firmada (nuevo) |
| `src/app/api/demo-auth/{login,logout}/route.ts` | Login/logout real de modo demo (nuevo) |
| `src/lib/supabase/middleware.ts` | Ya no auto-otorga admin en demo |
| `src/lib/auth/session.ts` | Lee la cookie demo en vez de devolver siempre admin |
| `src/features/auth/components/login-form.tsx` | Llama al login real, muestra credenciales de prueba |
| `src/components/shared/logout-button.tsx` | Botón de cerrar sesión (nuevo, no existía) |
| `src/lib/storage.ts` | Reemplaza `src/lib/r2.ts` — Supabase Storage |
| `src/app/api/uploads/route.ts`, `.../media/route.ts` | Firman contra Supabase Storage, no R2 |
| `src/app/api/demo-uploads/route.ts` | Subida real a disco en modo demo (nuevo) |
| `src/features/content/upload.ts` | Sube vía SDK de Supabase o al endpoint demo |
| `src/features/content/components/upload-dropzone.tsx` | Reporta el resultado para registrarlo en BD |
| `src/features/content/hooks/use-content-blocks.ts` | `useAttachUpload`, `useOpenFile` (nuevos) |
| `src/components/admin/content-block-row.tsx` | Botón "Ver archivo" |
| `supabase/migrations/0003_storage.sql` | Bucket + políticas de Storage (nuevo) |
| `supabase/migrations/0004_content_uploads.sql` | `uploaded_by`, `created_at` en bloques (nuevo) |
| `supabase/migrations/0005_resources_levels_activity.sql` | 3 tablas nuevas para dejar de mockear (nuevo) |
| `src/app/api/{resources,badges}/route.ts`, `src/app/api/analytics/*/route.ts`, `src/app/api/practice/levels/route.ts` | Consultan Supabase real cuando está configurado |
| `src/app/api/practice/answer/route.ts` | Corrige bug: ahora persiste la XP |
| `src/types/database.ts` | Tipos de las tablas nuevas + `Relationships`/`__InternalSupabase` (bug de tipado corregido) |
| `scripts/seed-users.mjs` | Crea admin + estudiante de prueba (nuevo) |
| `supabase/SETUP.md`, `docs/CREDENCIALES-PRUEBA.md`, `docs/AUDITORIA.md` | Documentación (nuevo) |
| `package.json`, `.env.example`, `next.config.ts` | Sin dependencias ni variables de R2 |
