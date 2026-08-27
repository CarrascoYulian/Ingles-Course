# Arquitectura

## Patrón: puertos + dos adaptadores

Todo acceso a datos pasa por **interfaces en `src/services/ports.ts`**:
- `Backend` (raíz) → sub-puertos: `courses`, `content`, `students`, `analytics`, `learning`, `practice`, `storage`

**Dos implementaciones intercambiables**:
1. **Demo**: `src/services/demo/backend.ts` (datos en memoria) + fixtures en `src/services/demo/data.ts`
   - Se usa si `IS_DEMO_MODE` es `true` (faltan `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` en `.env`)
2. **Supabase**: `src/services/supabase/backend.ts` (Postgres real bajo RLS, corre en navegador con cliente anon)

**Regla crítica**: Al agregar un método a un puerto, implementarlo **en LOS DOS backends** o `tsc` truena (y CI/deploy fallan). Pasó una vez: se agregó `LearningPort.listComments` sin implementación en un adaptador → tumbó el build.

Componentes e hooks **siempre importan `backend` desde `@/services`**, nunca Supabase directamente.

## `server-only` — límite real

Archivos marcados `import 'server-only'` (ej. `src/lib/storage.ts`, `src/app/api/practice/_constants.ts`) **literalmente no se pueden importar** en:
- Código que corre en navegador (`services/supabase/backend.ts`, hooks `'use client'`)
- Tests de Vitest

Next lo resuelve con alias especial en su bundler (no es una convención).

**Solución** si necesitas la misma lógica en ambos lados: extrae a módulo sin `server-only` e importa en los dos lados.

Ejemplos: `src/app/api/practice/logic.ts`, `src/features/learning/video-progress-math.ts`.

## Rutas API — patrón guard()

Casi todas empiezan igual:
```ts
const result = await guard('permiso:especifico');
if (isDenied(result)) return result.response;
```

- `guard()` en `src/app/api/_lib/guard.ts` valida sesión + permiso RBAC (`src/lib/auth/rbac.ts`, tabla `PERMISSIONS`)
- Devuelve perfil si OK, o ya la `NextResponse` de error
- Así cada ruta es un solo `if`

**Excepción**: rutas invocadas por Vercel Cron (ej. `/api/storage/reconcile`) se autentican con `CRON_SECRET` en header `Authorization`, no con `guard()`.

## Storage — contrato

- **Postgres**: guarda **solo la ruta** (`media_key`), no URLs (expiran) ni binarios
- **R2**: vive el binario real
- **Tabla única**: `lessons` (unificada en migración `0035_unify_lessons.sql`), reemplaza `content_blocks` + `course_resources`
  - Tipos: Video, PDF, Ejercicio, Audio, Evaluación — todos en la misma tabla
  - Un solo `media_key` por fila, mismo orden que arma el docente = orden que recorre el alumno

**Módulos** (`modules`): crear, renombrar, borrar, reordenar, duplicar desde el panel
- Duplicar: clona lecciones + evaluación con copia real del binario en R2 (nunca comparte `media_key` — si no, borrar original se llevaría el archivo de la copia)
- No duplica tareas (`assignments`) — llevan fecha límite propia
- Modo demo: solo rechaza explícitamente `removeModule`/`duplicateModule`
