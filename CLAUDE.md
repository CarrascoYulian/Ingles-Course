# CLAUDE.md

Guía rápida. Complementa `README.md` y `docs/AUDITORIA.md`.

## Qué es esto

Plataforma de cursos de inglés: panel docente (admin), vista del alumno y modo de práctica gamificado (XP, corazones, racha). Tech stack: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4 + Supabase (Postgres, Auth) + Cloudflare R2 (binarios grandes).

**GitHub**: `CarrascoYulian/Ingles-Course`, rama base `main`.

## Documentación modular

- [**Infraestructura**](docs/infraestructura.md) — Supabase, R2, Vercel, CI
- [**Arquitectura**](docs/arquitectura.md) — Puertos, adaptadores, `server-only`, rutas API, storage
- [**Testing**](docs/testing.md) — Vitest + funciones puras
- [**Migraciones**](docs/migraciones.md) — Convención SQL, RLS
- [**Gotchas**](docs/gotchas.md) — Trampas encontradas y cómo evitarlas
- [**Comandos**](docs/comandos.md) — npm run dev/typecheck/lint/test/build

## Regla crítica

Al agregar un método a `src/services/ports.ts`, **implementarlo en LOS DOS backends**:
- `src/services/demo/backend.ts` (datos en memoria)
- `src/services/supabase/backend.ts` (Postgres real)

Si no, `tsc` truena y CI/deploy fallan. Ya pasó: se agregó `LearningPort.listComments` solo en uno → tumbó el build.
