# Inglés con Método

Plataforma de cursos de inglés con panel docente, plataforma del alumno y
práctica gamificada. Next.js 15 (App Router) + React 19 + TypeScript +
Tailwind CSS v4 + Supabase (Postgres, Auth, Storage).

## Arranque rápido

```bash
npm install
npm run dev
```

Sin credenciales de Supabase, la app arranca en **modo demo** (datos en
memoria, login con las cuentas de prueba que se muestran en `/login`).

## Conectar Supabase

Ver [`supabase/SETUP.md`](supabase/SETUP.md) — 3 variables de entorno, 7
migraciones SQL, un script de datos de ejemplo y un script de usuarios de
prueba.

## Documentación

- [`docs/AUDITORIA.md`](docs/AUDITORIA.md) — estado del proyecto, módulo por módulo.
- [`docs/CREDENCIALES-PRUEBA.md`](docs/CREDENCIALES-PRUEBA.md) — cuentas de prueba.
- [`supabase/SETUP.md`](supabase/SETUP.md) — cómo conectar un proyecto Supabase real.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run seed:users` | Crea admin + estudiante de prueba en Supabase |
