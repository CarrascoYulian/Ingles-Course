# Infraestructura

## Servicios principales

| Servicio | Detalles |
|----------|----------|
| **GitHub** | `CarrascoYulian/Ingles-Course`, rama base `main` |
| **Supabase** | Proyecto `berthocommunity@gmail.com` (id `bbiipfzsicasespoqcqj`, org `vrekndkatftvqesdfruk`), región `us-east-2`. Plan Free (Postgres + Auth). **No** editar credenciales en el código. Verificar con MCP de Supabase si algo no cuadra. |
| **Cloudflare R2** | Binarios grandes (video, imagen, audio, PDF). Migrado desde Supabase Storage el 2026-08-19. Bucket privado, URLs firmadas. Cuota: 10 GB gratis, sin egress. |
| **Vercel** | Proyecto `berthocommunity` (id `prj_R3IAEGlk5Lsj92zmSVlcDqNpVl9a`). Deploys automáticos por PR; merge a `main` → producción. |
| **CI** | GitHub Actions (`.github/workflows/ci.yml`): lint → typecheck → test → build. |

## Cloudflare R2 — almacenamiento

**Cambio clave**: Postgres guarda **solo la ruta** (`media_key`), nunca URLs firmadas (expiran) ni binarios.

- Implementación: `src/lib/storage.ts` (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`)
- Credenciales: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` (ver `.env.example`)
- Límite subida: 5 GB por archivo (`MAX_BYTES` en `upload-dropzone.tsx`, no es arbitrario — es el techo de un `PutObject` sin multipart)
- Método: `XMLHttpRequest` con reintentos automáticos (no `fetch`), progreso real byte a byte
- Mutaciones (borrar, copiar): **solo server-side** via ruta API (`/api/storage/delete`, `/api/storage/reconcile`)
  - Rutas: `/api/uploads` (firmar), `/api/storage/delete` (al instante), `/api/modules/[moduleId]/duplicate` (clonar binarios con `CopyObjectCommand`)
- Limpieza: al instante via ruta API; cron semanal como red de seguridad para huérfanos

**Nota histórica**: `supabase/migrations/0003_storage.sql` (bucket `course-files` + políticas RLS) queda como histórico — no se edita ni borra, pero ya no se usa para binarios nuevos.
