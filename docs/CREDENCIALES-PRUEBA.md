# Credenciales de prueba

## Modo demo (sin Supabase configurado)

Se muestran directamente en la pantalla de `/login`, con un botón "Usar"
por cuenta. Válidas siempre que `IS_DEMO_MODE` esté activo (ver
`src/lib/env.ts`).

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@inglesconmetodo.demo` | `Admin#2026` |
| Estudiante | `estudiante@inglesconmetodo.demo` | `Estudiante#2026` |

## Con Supabase conectado

Las mismas dos cuentas, pero como usuarios reales de Supabase Auth. Se
crean ejecutando:

```bash
npm run seed:users
```

(requiere `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en
`.env.local` — ver [`supabase/SETUP.md`](../supabase/SETUP.md)).

| Rol | Correo | Contraseña | Matrícula |
| --- | --- | --- | --- |
| Administrador | `admin@inglesconmetodo.demo` | `Admin#2026` | — |
| Estudiante | `estudiante@inglesconmetodo.demo` | `Estudiante#2026` | ING-000072 |

El estudiante queda matriculado automáticamente en el curso "Inglés
conversacional" (sembrado por `supabase/seed.sql`), con un 54 % de avance
de partida.

**Estas credenciales son sólo para pruebas.** Si este proyecto llega a
producción con usuarios reales, borra ambas cuentas desde
**Authentication → Users** en el panel de Supabase.
