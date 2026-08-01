# Plataforma Inglés — Roadmap de MVPs e Issues

Este documento es el borrador de los 3 milestones y sus issues, derivados de la auditoría técnica del 2026-07-30. Se subirán a GitHub (milestones + issues) en cuanto se autorice el acceso.

Repo: `CarrascoYulian/Ingles-Course`

---

## Milestone 1 — MVP1: Panel Administrativo

Objetivo: el docente puede crear cursos reales con múltiples módulos, subir archivos/video, gestionar estudiantes y ver KPIs reales — sin bugs de curso único ni acciones falsas (botones que solo muestran un toast).

### Bugs críticos / bloqueantes
1. **[Bug] "Editar curso" siempre abre el mismo módulo global, sin importar el curso** — `src/features/courses/components/courses-view.tsx:91`, `src/services/supabase/backend.ts:296-304`. `getCurrentModule()` no filtra por `courseId`. Con más de un curso, todos los docentes editan el mismo único módulo.
2. **[Bug] No existe listado/navegación de módulos por curso** — falta `listModules(courseId)` en `ContentPort`/`LearningPort` (`src/services/ports.ts:98-110`). No se puede crear un segundo módulo y volver a editar el primero.
3. **[Bug] Reordenar bloques de contenido puede fallar por condición de carrera** — `src/services/supabase/backend.ts:153-166` hace el swap de `position` con dos updates independientes en `Promise.all` en vez de una transacción/RPC atómica; puede violar la restricción única `(module_id, position)`.
4. **[Bug] Subida de archivos usa `courseId: 'curso'` hardcodeado** — `src/app/api/uploads/route.ts:43`. Rompe la jerarquía de Storage por curso (`src/lib/storage.ts:101-104`).
5. **[Bug] Matrícula de estudiante puede duplicar `enrollment_code` bajo concurrencia** — `src/app/api/students/invite/route.ts:32-37`, código calculado desde un `count()` no atómico.
6. **[Bug] Ficha de estudiante toma un enrollment arbitrario si tiene varios cursos** — `src/services/supabase/backend.ts:223-230`, `enrollments[0]` sin `order by` ni filtro.

### Funcionalidad faltante
7. **[Feature] Botón "Guardar módulo" no persiste nada, solo muestra un toast** — `src/features/content/components/content-view.tsx:56-59`.
8. **[Feature] "Vista previa del alumno" es un botón sin acción** — `src/features/content/components/content-view.tsx:112-114`.
9. **[Feature] No hay edición de curso (nombre/nivel) ni reordenamiento de cursos** — falta `update`/`reorder` en `CoursesPort` (`src/services/ports.ts:48-53`).
10. **[Feature] "Exportar CSV" en Reportes es un toast falso, no genera archivo** — `src/features/analytics/components/reports-view.tsx:23-24`.

### Escalabilidad
11. **[Perf] Listados de estudiantes y cursos sin paginación** — `src/services/supabase/backend.ts:210-222`, `:62-66`.
12. **[Perf] Agregados de curso (promedio de progreso) traen todas las filas de `enrollments` a JS en vez de agregación en SQL** — `src/services/supabase/backend.ts:61-82`, TODO ya reconocido en `src/app/api/analytics/metrics/route.ts:25-26`.

---

## Milestone 2 — MVP2: Experiencia del Estudiante (Cursos)

Objetivo: el estudiante puede completar cursos reales (multi-curso), ver video real con progreso real, navegar módulo por módulo y por lección vía deep-link.

### Bugs críticos / bloqueantes
1. **[Bug] Estudiante siempre ve el mismo módulo global sin importar su curso/nivel** — `src/features/learning/hooks/use-learning.ts:15-20` (mismo origen que MVP1 #1). Depende de resolver `courseId` en `LearningPort`.
2. **[Bug] El reproductor de video es simulado, no reproduce video real** — `src/features/learning/hooks/use-video-progress.ts:54-66` incrementa `watched` con un `setInterval` artificial; `CourseView` (`src/features/learning/components/course-view.tsx:65-80`) no pasa `src`/`poster` reales al `<VideoPlayer>` pese a que el backend ya expone URLs firmadas (`/api/media`).
3. **[Bug] Navegación a lección usa parámetros de ruta hardcodeados `'b1'`/`'modulo-4'`** — `src/features/learning/components/course-view.tsx:129`.
4. **[Bug] La página de lección con deep-link ignora sus propios parámetros de URL** — `src/app/(student)/curso/[nivel]/[modulo]/[leccion]/page.tsx:20-22`; siempre renderiza "la lección actual" calculada internamente, nunca la de la URL.
5. **[Bug] Lógica de "lección actual/bloqueada" asume `position` consecutivo sin huecos** — `src/services/supabase/mappers.ts:53-63`, puede marcar 0 o 2 lecciones como "current" simultáneamente.

### Funcionalidad faltante / hardcodeo
6. **[Bug] Duración de lección fija (`08:24`) ignora la duración real de cada lección** — `src/features/learning/hooks/use-video-progress.ts:12,89`.
7. **[Feature] Guardado de progreso de video falla silenciosamente sin reintento** — `src/features/learning/hooks/use-learning.ts:84-90`, `onError: () => undefined`.
8. **[Bug] `getMyProgress` toma un enrollment arbitrario si el estudiante tiene varios cursos** — `src/services/supabase/backend.ts:358-388`.

### Escalabilidad
9. **[Perf] `listLessons` sin límite superior de lecciones por módulo** — `src/services/supabase/backend.ts:306-329`.

---

## Milestone 3 — MVP3: Modo Práctica (Duolingo-like)

Objetivo: el modo de práctica funciona como un producto de juego de aprendizaje independiente, con progreso real persistente, banco de preguntas real, corazones/XP/rachas funcionales — separado del flujo de cursos.

### Bugs críticos / bloqueantes
1. **[Bug de seguridad] Falta política RLS de `update` en `practice_progress` — probablemente rompe el guardado tras el primer intento** — `supabase/migrations/0002_rls.sql` solo define `select`/`insert`; los endpoints (`/api/practice/answer`, `/api/practice/advance`) hacen `upsert` bajo RLS de usuario (no service role), por lo que el segundo intento de cualquier estudiante fallaría con 500.
2. **[Bug] El banco de preguntas tiene un único ejercicio hardcodeado** — `src/app/api/practice/_bank.ts:11`, `BANK = [DEMO_QUESTION]`; no existe tabla `practice_questions` en las migraciones.
3. **[Bug] Sistema de corazones/vidas no funcional, valor decorativo fijo** — `src/app/api/practice/session/route.ts:16`, `src/app/api/practice/advance/route.ts:49` siempre devuelven `{ total: 3, remaining: 1 }`; no hay columna `hearts` en `practice_progress` ni lógica que reste vidas al fallar.
4. **[Bug] Estudiante nuevo recibe progreso de ejemplo (XP 1240, racha 12) en vez de estado inicial en cero** — `DEFAULT_SESSION` en `src/app/api/practice/session/route.ts:9-17` se devuelve tal cual cuando no existe fila en `practice_progress`.
5. **[Bug] `totalSteps: 10` hardcodeado en sesión/avance, ignora `practice_levels.total_steps` configurado en BD** — `session/route.ts:16`, `advance/route.ts:45`.
6. **[Bug de seguridad] `/api/practice/answer` no valida que la pregunta corresponda al paso actual del estudiante** — permite reenviar respuestas de pasos ya completados para acumular XP indebidamente una vez exista un banco real.

### Funcionalidad faltante / hardcodeo de UI
7. **[Feature] Misiones diarias/semanales y próxima insignia son literales estáticos en el JSX, no datos reales** — `src/features/practice/components/practice-view.tsx:75-81`.
8. **[Bug] Nivel/estado "por defecto" asume que todo estudiante ya está en Nivel 3** — `levelId: 'n3'` en backend y fallback `'Nivel 3'` en `src/features/practice/components/practice-view.tsx:37`.

### Separación de producto
9. **[Decisión de producto / ADR] Documentar si el progreso de Práctica y el progreso de Cursos deben estar relacionados (ej. desbloqueo cruzado) o permanecer 100% independientes** — hoy son independientes por diseño pero sin ADR que lo confirme.
10. **[Seguridad] RLS de `practice_progress`/`practice_levels` no verifica `profiles.is_active`** — un estudiante desactivado puede seguir jugando práctica aunque no pueda acceder a otros flujos.

---

## Transversal (no ligado a un solo MVP — crear como issues en el milestone que primero los necesite, o "Infra/Backlog" sin milestone)

1. **[Seguridad] `DEMO_AUTH_SECRET` con valor por defecto inseguro y sin fail-closed** — `src/lib/env.ts:25`. Si el entorno queda mal configurado y cae a modo demo en producción, cualquiera puede firmar su propia cookie de admin con el secreto por defecto público.
2. **[Seguridad] Sin rate limiting en `/api/demo-auth/login`** — permite fuerza bruta contra las cuentas demo.
3. **[Seguridad] Credenciales demo hardcodeadas en el código fuente** (`admin@inglesconmetodo.demo / Admin#2026`) — rotar/eliminar antes de cualquier entorno público.
4. **[Infra] No existe `.github/workflows` — sin CI que corra lint/typecheck/build en cada PR.**
5. **[Infra] No existe ningún test automatizado (unit/integration/e2e)** — cero cobertura sobre cálculo de progreso, RBAC, mappers demo↔Supabase, rutas de práctica.
6. **[Arquitectura] Duplicación de constantes de práctica (`totalSteps`, `hearts`) en múltiples archivos en vez de una única fuente de verdad.**

---

## Siguiente paso

En cuanto se autorice el acceso a GitHub (conector MCP o `gh` CLI autenticado), se crearán:
- 3 milestones: `MVP1 - Panel Administrativo`, `MVP2 - Experiencia del Estudiante`, `MVP3 - Modo Práctica`
- Un issue de GitHub por cada punto de arriba, etiquetado con `bug`/`feature`/`security`/`perf`/`infra` según corresponda, asignado a su milestone.
