# Plataforma Inglés — Roadmap de MVPs e Issues

Este documento es el borrador de los 3 milestones y sus issues, derivados de la auditoría técnica del 2026-07-30. Se subirán a GitHub (milestones + issues) en cuanto se autorice el acceso.

Repo: `CarrascoYulian/Ingles-Course`

---

## Milestone 1 — MVP1: Panel Administrativo

Objetivo: el docente puede crear cursos reales con múltiples módulos, subir archivos/video, gestionar estudiantes y ver KPIs reales — sin bugs de curso único ni acciones falsas (botones que solo muestran un toast).

### Bugs críticos / bloqueantes
1. ~~**[Bug] "Editar curso" siempre abre el mismo módulo global, sin importar el curso**~~ — **Resuelto.** `/admin/contenido?courseId=...` resuelve módulos por curso real vía `useModules(courseId)`.
2. ~~**[Bug] No existe listado/navegación de módulos por curso**~~ — **Resuelto.** `ContentPort.listModules(courseId)` + pestañas de módulo en el constructor de contenido.
3. ~~**[Bug] Reordenar bloques de contenido puede fallar por condición de carrera**~~ — **Resuelto.** RPC atómico `swap_content_block_position` (migración `0008_atomic_block_reorder.sql`).
4. ~~**[Bug] Subida de archivos usa `courseId: 'curso'` hardcodeado**~~ — **Resuelto.** `courseId` real de punta a punta.
5. ~~**[Bug] Matrícula de estudiante puede duplicar `enrollment_code` bajo concurrencia**~~ — **Resuelto.** Secuencia atómica de Postgres (`enrollment_code_seq` / `next_enrollment_code()`, migración `0009_enrollment_code_sequence.sql`).
6. ~~**[Bug] Ficha de estudiante toma un enrollment arbitrario si tiene varios cursos**~~ — **Resuelto.** `enrollments` ordenado por `created_at desc` en la consulta.

### Funcionalidad faltante
7. ~~**[Feature] Botón "Guardar módulo" no persiste nada, solo muestra un toast**~~ — **Resuelto.** Se quitó: cada cambio ya persiste al instante, un botón "guardar" era una mentira redundante.
8. ~~**[Feature] "Vista previa del alumno" es un botón sin acción**~~ — **Resuelto parcialmente.** Abre la vista real del alumno (`/curso`) en pestaña nueva; el deep-link al módulo exacto depende de que el flujo del alumno sea consciente del curso (MVP2 #1).
9. ~~**[Feature] No hay edición de curso ni reordenamiento**~~ — **Resuelto.** Edición (`EditCourseDialog` + `CoursesPort.update`) y reordenamiento con flechas ↑/↓ (no arrastre — más simple y accesible) + RPC atómico `swap_course_position` (migración `0016_atomic_course_reorder.sql`). Deshabilitado mientras hay un filtro de nivel activo, para no reordenar contra un vecino que no es el real.
10. ~~**[Feature] "Exportar CSV" en Reportes es un toast falso, no genera archivo**~~ — **Resuelto.** Genera y descarga un CSV real (`src/lib/csv.ts`) con los datos del reporte activo.

### Escalabilidad
11. ~~**[Perf] Listados de estudiantes y cursos sin paginación**~~ — **Resuelto para estudiantes** (20 por página, con `count: 'exact'` + `.range()` y controles Anterior/Siguiente). Cursos no pagina — el volumen esperado es bajo (decenas, no miles).
12. ~~**[Perf] Agregados de curso traen todas las filas de `enrollments` a JS**~~ — **Resuelto.** Vista `course_aggregates` (migración `0010_course_aggregates_view.sql`) agrega en Postgres.

---

## Milestone 2 — MVP2: Experiencia del Estudiante (Cursos)

Objetivo: el estudiante puede completar cursos reales (multi-curso), ver video real con progreso real, navegar módulo por módulo y por lección vía deep-link.

### Bugs críticos / bloqueantes
1. ~~**[Bug] Estudiante siempre ve el mismo módulo global sin importar su curso/nivel**~~ — **Resuelto.** `getMyCourses()` resuelve las matrículas reales del alumno; `getCurrentModule(courseId)` ahora exige el curso. Con más de un curso matriculado aparece un selector (`ChipRow`) en `CourseView`.
2. ~~**[Bug] El reproductor de video es simulado**~~ — **Resuelto.** `lessons.media_key` (ya existía en el esquema, sin usar) ahora se expone y se reproduce en un `<video>` real (`ref` + `timeupdate`/`ended`), sin ningún temporizador simulado. Nota: no existe todavía una UI de admin para adjuntar el video a una lección — hasta entonces se muestra honestamente "Video no disponible todavía" en vez de bloquear al alumno.
3. ~~**[Bug] Navegación a lección usa parámetros de ruta hardcodeados**~~ — **Resuelto.** Usa el nivel real del curso y el id real del módulo.
4. ~~**[Bug] La página de lección con deep-link ignora sus propios parámetros de URL**~~ — **Resuelto.** `LessonPage` pasa `lessonOrder` real a `CourseView`, que respeta la lección pedida por la URL en vez de recalcular siempre "la actual".
5. ~~**[Bug] Lógica de "lección actual/bloqueada" dependía de `position === 1`**~~ — **Resuelto.** Se quitó esa condición redundante y peligrosa; el estado se deriva únicamente del encadenamiento secuencial (`previousCompleted`), cubierto ahora por tests (`mappers.test.ts`).

### Funcionalidad faltante / hardcodeo
6. ~~**[Bug] Duración de lección fija (`08:24`)**~~ — **Resuelto.** `useVideoProgress` recibe la duración real de `lessons.duration_minutes`.
7. ~~**[Feature] Guardado de progreso de video sin reintento**~~ — **Resuelto.** `retry: 3` con backoff exponencial.
8. ~~**[Bug] `getMyProgress` toma un enrollment arbitrario**~~ — **Ya estaba resuelto** (ordenado por `created_at desc`, confirmado en esta auditoría).

### Escalabilidad
9. ~~**[Perf] `listLessons` sin límite superior**~~ — **Resuelto.** `.limit(200)` como salvaguarda defensiva.

---

## Milestone 3 — MVP3: Modo Práctica (Duolingo-like)

Objetivo: el modo de práctica funciona como un producto de juego de aprendizaje independiente, con progreso real persistente, banco de preguntas real, corazones/XP/rachas funcionales — separado del flujo de cursos.

### Bugs críticos / bloqueantes
1. ~~**[Bug de seguridad] Falta política RLS de `update` en `practice_progress`**~~ — **Resuelto.** Migración `0012_practice_progress_update_policy.sql`.
2. ~~**[Bug] El banco de preguntas tiene un único ejercicio hardcodeado**~~ — **Resuelto (2026-08-08, a pedido explícito del usuario).** Tabla real `practice_questions` (migración `0018_practice_questions.sql`) con 80 preguntas — 16 por nivel CEFR (A1-C1), cada una con 4 opciones y explicación de acierto/error. `practice_levels` se expandió a 500 niveles (migración `0017_practice_levels_500.sql`): 1-100→A1, 101-200→A2, 201-300→B1, 301-400→B2, 401-500→C1. `_bank.ts` resuelve la pregunta real según el nivel CEFR y el paso del alumno, cicladas dentro de las 16 de su tramo. `/api/practice/levels` acota la respuesta a una ventana de ±20 niveles alrededor del actual (nunca los 500 de golpe).
3. ~~**[Bug] Sistema de corazones/vidas no funcional**~~ — **Resuelto.** Columna real `hearts_remaining` (migración `0014_practice_hearts.sql`); se resta 1 al fallar, se recarga a 3 al subir de nivel.
4. ~~**[Bug] Estudiante nuevo recibe progreso de ejemplo**~~ — **Resuelto.** Sin fila en `practice_progress`, la API devuelve XP/coins/racha en 0 y corazones al máximo — el fixture de demo (XP 1240) sólo se sirve en modo demo.
5. ~~**[Bug] `totalSteps: 10` hardcodeado**~~ — **Resuelto.** `session` y `advance` leen `practice_levels.total_steps` del nivel real; `advance` ahora también sube de nivel de verdad al completar los pasos (antes se quedaba atascado en el paso 10 para siempre).
6. ~~**[Bug de seguridad] `/api/practice/answer` no valida el paso**~~ — **Resuelto.** Verifica que la pregunta enviada corresponda al `current_step` guardado; si no, responde 409.

### Funcionalidad faltante / hardcodeo de UI
7. **[Feature] Misiones diarias/semanales y próxima insignia son literales estáticos en el JSX** — `src/features/practice/components/practice-view.tsx:75-81`. **Requiere decisión humana**: es una función nueva (tabla + lógica de cálculo), no un arreglo — hace falta definir las reglas del juego (qué cuenta como meta diaria, umbrales de racha, recompensas) antes de construirla.
8. ~~**[Bug] Nivel/estado "por defecto" asume Nivel 3**~~ — **Resuelto.** Fallback cambiado a "Nivel 1" (el nivel real de un estudiante nuevo) mientras carga.

### Separación de producto
9. ~~**[Decisión de producto / ADR] ¿Progreso de Práctica y de Cursos relacionados o independientes?**~~ — **Resuelto.** Decisión confirmada por el usuario (2026-08-08): permanecen 100% independientes. Ver [`docs/ADR-001-practica-independiente-de-cursos.md`](ADR-001-practica-independiente-de-cursos.md).
10. ~~**[Seguridad] RLS no verifica `profiles.is_active`**~~ — **Resuelto para `practice_progress`** (migración `0013_practice_progress_requires_active.sql`, función `is_active_student()`). El mismo vacío existe en `enrollments`/`lesson_progress`/`student_badges` — queda para una pasada de seguridad dedicada (no estaba pidiéndose aquí).

---

## Transversal (no ligado a un solo MVP — crear como issues en el milestone que primero los necesite, o "Infra/Backlog" sin milestone)

1. ~~**[Seguridad] `DEMO_AUTH_SECRET` con valor por defecto inseguro y sin fail-closed**~~ — **Resuelto.** El valor por defecto sólo aplica fuera de producción; en producción sin el valor explícito el arranque falla (falla cerrado).
2. ~~**[Seguridad] Sin rate limiting en `/api/demo-auth/login`**~~ — **Resuelto.** Límite de 10 intentos/minuto por IP (`src/lib/rate-limit.ts`). Limitación conocida: en memoria del proceso, no compartido entre instancias.
3. ~~**[Seguridad] Credenciales demo hardcodeadas en el código fuente**~~ — **Resuelto (2026-08-08, a pedido explícito del usuario).** Ya no están en ningún archivo versionado: viven sólo en `.env.local` (`DEMO_ADMIN_EMAIL`/`DEMO_ADMIN_PASSWORD`/`DEMO_STUDENT_EMAIL`/`DEMO_STUDENT_PASSWORD`). El panel "usar cuenta" de `/login` las pide a `/api/demo-auth/accounts`, que las lee del entorno del servidor — nunca aparecen como texto literal en el código. Ver `docs/CREDENCIALES-PRUEBA.md`.
4. ~~**[Infra] No existe `.github/workflows` — sin CI**~~ — **Resuelto.** `.github/workflows/ci.yml` corre lint + typecheck + build en cada PR/push a `main`.
5. ~~**[Infra] No existe ningún test automatizado**~~ — **Resuelto parcialmente.** Se agregó Vitest + primeras pruebas unitarias reales (RBAC, cálculo de estado de lecciones), conectado a CI. Cobertura todavía baja — no hay integration/e2e; es una base, no el trabajo terminado.
6. ~~**[Arquitectura] Duplicación de constantes de práctica**~~ — **Resuelto.** `src/app/api/practice/_constants.ts` centraliza `HEARTS_TOTAL` y `DEFAULT_TOTAL_STEPS`.

---

## Estado (actualizado 2026-08-08)

Todos los issues técnicos están resueltos y verificados (`tsc` + `lint` + `test` + `build`, en verde), incluidos los cuatro que antes esperaban una decisión humana — el usuario los resolvió explícitamente en esta sesión:

- **MVP3 #2** (banco de preguntas): resuelto — banco real de 80 preguntas, 500 niveles de juego mapeados a 5 tramos CEFR.
- **MVP3 #9** (ADR práctica/cursos): resuelto — permanecen independientes, confirmado por el usuario.
- **Transversal #3** (credenciales demo): resuelto — sacadas del código fuente, sólo en `.env.local`.

Sólo queda pendiente:

- **MVP3 #7** — Misiones diarias/semanales reales. Sigue requiriendo decisión humana: hace falta definir las reglas del juego (qué cuenta como meta diaria, umbrales de racha, recompensas) antes de construir la infraestructura.

Además, fuera de esta lista pero descubierto en el camino: la cuenta de prueba `estudiante@inglesconmetodo.demo` tiene una contraseña que no coincide con la documentada en el proyecto Supabase conectado — hace falta re-ejecutar `npm run seed:users` o resetearla desde el panel de Supabase (Authentication → Users) para poder probar el flujo del alumno en vivo.

También queda como mejora natural, no bloqueante: no existe todavía una UI de administrador para crear lecciones ni adjuntarles un video (el reproductor ya es real, pero hoy sólo se puede alimentar por SQL directo).

## Siguiente paso

En cuanto se autorice el acceso a GitHub (conector MCP o `gh` CLI autenticado), se crearán:
- 3 milestones: `MVP1 - Panel Administrativo`, `MVP2 - Experiencia del Estudiante`, `MVP3 - Modo Práctica`
- Un issue de GitHub por cada punto resuelto (para trazabilidad histórica) y por cada punto pendiente de este documento, etiquetado con `bug`/`feature`/`security`/`perf`/`infra` según corresponda, asignado a su milestone.
