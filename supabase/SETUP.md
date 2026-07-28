# Conectar el proyecto a Supabase

Sin esto, la app corre en **modo demo** (datos en memoria, login con las dos
cuentas de prueba mostradas en `/login`). Estos pasos la conectan a un
proyecto real: base de datos, autenticación y almacenamiento de archivos.

## 1. Crear el proyecto (2-3 minutos)

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta gratuita (o
   inicia sesión si ya tienes una).
2. **New Project** → elige una organización, ponle un nombre (p. ej.
   `ingles-con-metodo`), genera una contraseña de base de datos (guárdala,
   no la necesitas para esta app pero sí si conectas otras herramientas) y
   elige la región más cercana.
3. Espera ~2 minutos a que aprovisione el proyecto.

## 2. Copiar las credenciales

En el panel del proyecto: **Project Settings → API**.

| Variable | Dónde está | Va en |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | "Project URL" | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | "anon public" | `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | "service_role" (botón "Reveal") | `.env.local` (¡nunca en el cliente!) |

Copia `.env.example` a `.env.local` y pega los tres valores:

```bash
cp .env.example .env.local
```

## 3. Aplicar el esquema

En el panel de Supabase: **SQL Editor → New query**. Pega y ejecuta, **en
este orden**, el contenido de cada archivo de `supabase/migrations/`:

1. `0001_schema.sql` — tablas base (perfiles, cursos, módulos, matrículas…)
2. `0002_rls.sql` — políticas de seguridad a nivel de fila
3. `0003_storage.sql` — bucket de archivos + políticas de Storage
4. `0004_content_uploads.sql` — metadatos de quién subió qué
5. `0005_resources_levels_activity.sql` — recursos, niveles de práctica, bitácora

(Si tienes el CLI de Supabase instalado y el proyecto enlazado, basta con
`supabase db push` en vez de pegar archivo por archivo.)

## 4. Cargar contenido de ejemplo (opcional pero recomendado)

Ejecuta también `supabase/seed.sql` en el SQL Editor: crea los mismos 4
cursos, el módulo 4 con sus bloques y las 6 insignias que ya viste en el
modo demo, para que la plataforma no arranque completamente vacía.

## 5. Crear los usuarios de prueba

```bash
npm run seed:users
```

Esto crea (vía la Admin API, con la service role key) un administrador y un
estudiante, y matricula al estudiante en "Inglés conversacional". Las
credenciales quedan impresas en la terminal — también están en
[`docs/CREDENCIALES-PRUEBA.md`](../docs/CREDENCIALES-PRUEBA.md).

## 6. Reiniciar

```bash
npm run dev
```

La app detecta las variables de entorno automáticamente
(`src/lib/env.ts` → `IS_DEMO_MODE` pasa a `false`) y deja de mostrar el
aviso de modo demo en `/login`.

## Verificación rápida

- `/login` ya no muestra las cuentas de prueba en la propia página (esas
  sólo aparecen en modo demo) — inicia sesión con las credenciales de arriba.
- El dashboard (`/admin/dashboard`) muestra `0` o números reales en vez de
  `287`, `342`, etc. — es la señal de que está leyendo de Supabase, no de
  la memoria.
- Sube un archivo en **Contenido → Añadir bloque** y comprueba que aparece
  en el bucket `course-files` del panel de Supabase (**Storage**).
