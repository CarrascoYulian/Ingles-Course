# CLAUDE.md

Guía de orientación rápida para trabajar en este repo sin tener que
re-explorarlo desde cero. Complementa (no reemplaza) `README.md` y
`docs/AUDITORIA.md`.

## Qué es esto

Plataforma de cursos de inglés: panel docente (admin/instructor), vista del
alumno y un modo de práctica gamificado estilo Duolingo (XP, corazones,
racha). Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4 +
Supabase (Postgres, Auth, Storage).

## Infraestructura real (no asumir, verificar si algo no cuadra)

- **Repo GitHub:** `CarrascoYulian/Ingles-Course`. Rama base: `main`.
- **Supabase:** proyecto `berthocommunity@gmail.com's Project` (id `bbiipfzsicasespoqcqj`,
  org `vrekndkatftvqesdfruk`), región `us-east-2`. Se migró desde el proyecto
  viejo `ingles-con-metodo` (`uowupbmydcmhqkayzfwy`) a esta cuenta nueva
  (`berthocommunity@gmail.com`) — si algo de infraestructura no cuadra con
  este id, verificar de nuevo con el MCP de Supabase antes de asumir.
  - **Plan Free.** Esto importa mucho más de lo que parece:
    - Cuota total de Storage: **1 GB** (no 200 GB — un mock viejo del diseño decía eso y quedó hardcodeado un tiempo, ver `STORAGE_PLAN_LIMIT_BYTES` en `src/lib/storage.ts`).
    - **Límite global de archivo: 50 MB**, sin importar lo que diga `file_size_limit` en `storage.buckets` (la migración `0003_storage.sql` pide 2 GB a nivel de bucket, pero la plataforma lo recorta a 50 MB en Free). Cualquier video de más de 50 MB probablemente falla al subir — ver `docs/guia-subida-de-videos.md`.
    - Verificar con el MCP de Supabase (`get_organization` sobre el org id `vrekndkatftvqesdfruk`) antes de asumir que esto cambió.
- **Vercel:** proyecto `berthocommunity` (id `prj_R3IAEGlk5Lsj92zmSVlcDqNpVl9a`, team
  `bertho-community-team1` / `team_PdSs2OVZpugZsloTLvynHuh9` — antes
  `ingles-course` / `carrasco-team1`, migrado a la cuenta `berthocommunity@gmail.com`).
  Deploys automáticos por PR vía integración de GitHub; merge a `main` dispara
  producción.
- **CI:** GitHub Actions (`.github/workflows/ci.yml`) — lint → typecheck → test → build, en cada PR/push a `main`.

## Arquitectura: puertos + dos adaptadores

Todo el acceso a datos pasa por interfaces en `src/services/ports.ts`
(`Backend` con sub-puertos `courses`, `content`, `students`, `analytics`,
`learning`, `practice`, `storage`). Hay **dos implementaciones
intercambiables**:

- `src/services/demo/backend.ts` — datos en memoria, fixtures en
  `src/services/demo/data.ts`. Se usa cuando `IS_DEMO_MODE` es `true`
  (`src/lib/env.ts`: faltan `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`).
- `src/services/supabase/backend.ts` — Postgres real bajo RLS, corre en el
  navegador con el cliente anon (`getSupabaseBrowserClient`). Cada query
  confía en que RLS ya filtró lo que el usuario puede ver — no repetir
  comprobaciones de autorización aquí.

**Al agregar un método a un puerto, hay que implementarlo en LOS DOS
backends o `tsc` (y por lo tanto el build/CI) truena.** Ya pasó una vez
(ver `git log` del commit `043c545`): se agregó `LearningPort.listComments`
sin implementarlo en ninguno de los dos adaptadores y tumbó CI + el deploy
de Vercel.

Componentes y hooks importan `backend` desde `@/services`, nunca Supabase
directamente.

## `server-only` — límite real, no decorativo

Archivos marcados `import 'server-only'` (ej. `src/lib/storage.ts`,
`src/app/api/practice/_constants.ts`, `_missions.ts`) literalmente **no se
pueden importar** en código que corre en el navegador (`services/supabase/backend.ts`,
cualquier hook `'use client'`) ni en tests de Vitest — el paquete
`server-only` ni siquiera está instalado como dependencia normal; Next lo
resuelve con un alias especial en su propio bundler. Si necesitás la misma
constante/lógica en ambos lados, extraela a un módulo sin ese import (ver
`src/app/api/practice/logic.ts` o `src/features/learning/video-progress-math.ts`
como ejemplo del patrón: lógica pura sin `server-only`, importada tanto por
la ruta del servidor como por el test).

## Convención de rutas API (Route Handlers)

Casi todas empiezan igual:

```ts
const result = await guard('permiso:especifico');
if (isDenied(result)) return result.response;
```

`guard()` (en `src/app/api/_lib/guard.ts`) valida sesión + permiso RBAC
(`src/lib/auth/rbac.ts`, tabla `PERMISSIONS`) y devuelve el perfil o ya la
`NextResponse` de error — así cada ruta es un solo `if`. Rutas invocadas
por Vercel Cron (ej. `/api/storage/reconcile`) son la excepción: se
autentican con `CRON_SECRET` en el header `Authorization`, no con `guard()`,
porque no hay sesión de usuario en una invocación programada.

## Storage: contrato importante

Postgres guarda **sólo la ruta** del objeto (`media_key`), nunca URLs — las
URLs firmadas expiran. `content_blocks.media_key`, `lessons.media_key` y
`course_resources.media_key` normalmente apuntan al mismo objeto físico
(ver `attachUpload` en `supabase/backend.ts`, que crea las tres filas a la
vez). Borrar un `content_block` borra también el objeto real en Storage
(issue #37); un cron semanal (`/api/storage/reconcile`, issue #38) limpia
huérfanos de más de 48h que se hayan colado.

## Testing

`npm test` = Vitest, **entorno `node`** (sin jsdom, sin
`@testing-library/react` instalados). Sólo se testean **funciones puras**
— nada que dependa de renderizar un componente o de un DOM real. Patrón:
extraer el cálculo a un módulo sin `server-only` ni dependencias de React,
testear ese módulo (`src/app/api/practice/logic.ts`,
`src/features/learning/video-progress-math.ts`,
`src/services/supabase/mappers.ts`, `src/lib/auth/rbac.ts`). Si algún día
hace falta testear un componente/hook de verdad, primero hay que instalar
`@testing-library/react` + un entorno DOM y decidir eso explícitamente —
no asumir que ya está disponible.

## Migraciones

`supabase/migrations/NNNN_descripcion.sql`, numeradas secuencialmente,
nunca se editan una vez mergeadas — un cambio nuevo es una migración
nueva. RLS habilitado en toda tabla nueva desde el día uno; `is_staff()` y
`is_active_student()` (definidas en `0002_rls.sql`) son las funciones base
que casi todas las políticas reutilizan.

## Comandos

```bash
npm run dev         # servidor de desarrollo
npm run typecheck   # tsc --noEmit — correr esto antes de dar nada por terminado
npm run lint
npm test            # vitest run
npm run build       # como CI
```

## Gotchas ya encontrados (para no repetir la investigación)

- El widget de sidebar "Almacenamiento" del panel admin (issue #39) no
  existía en el código pese a que el diseño lo daba por hecho — se
  construyó desde cero (`src/components/admin/storage-usage-widget.tsx`).
- `/login` redirige directo al panel si ya hay sesión activa (cookie de
  Supabase Auth) — es el comportamiento esperado del middleware
  (`src/middleware.ts`), no una falla de autenticación. Para probar el
  formulario de login de verdad, hace falta una sesión limpia (sin cookies).
- No hay forma de loguearse en el navegador sin contraseña — para
  verificar UI sin credenciales, se puede levantar una página temporal
  fuera de `PROTECTED_PREFIXES` (`src/constants/routes.ts`), o comentar
  temporalmente `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` en `.env.local` para
  forzar modo demo (recordar restaurar después).
- El leaderboard (`/api/analytics/leaderboard`) agrupaba por fila de
  `enrollments` en vez de por alumno — un alumno matriculado en 2+ cursos
  aparecía dos veces con la misma `key` de React. Corregido agregando por
  `profiles.id` antes de cortar el top 5.
