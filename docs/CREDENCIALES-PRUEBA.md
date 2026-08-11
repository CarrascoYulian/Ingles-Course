# Credenciales de prueba

Las credenciales de las dos cuentas de prueba (administrador y estudiante)
**ya no están escritas en el código fuente** — antes vivían como texto
literal en `demo-session.ts`, en la pantalla de login y en
`scripts/seed-users.mjs`, visibles para cualquiera con acceso al repositorio
(incluido GitHub, aunque sea privado).

Ahora sólo existen en `.env.local`, que está excluido de git (`.gitignore`).

## Docente (correo + contraseña)

El docente sigue entrando con correo y contraseña normal.

```
DEMO_ADMIN_EMAIL
DEMO_ADMIN_PASSWORD
```

## Alumno (matrícula + PIN de 4 dígitos)

Con Supabase conectado, el alumno **ya no entra con una contraseña libre**
— entra con su matrícula (`ING-000072`, etc.) y un PIN de 4 dígitos, más
simple de recordar y compartir. El docente le asigna el PIN al crear al
alumno desde el panel (**Estudiantes → Nuevo estudiante**), y la app
muestra la matrícula y el PIN en un recuadro con botón de copiar.

Por dentro, Supabase Auth exige contraseñas de 6+ caracteres, así que la
contraseña real que se guarda se deriva combinando matrícula + PIN (ver
`src/lib/auth/student-pin.ts`) — el PIN nunca se guarda ni se compara solo.

El alumno de prueba (`Roberto`, matrícula `ING-000072`) se crea con:

```
DEMO_STUDENT_EMAIL
DEMO_STUDENT_PIN
```

```bash
node --env-file=.env.local scripts/seed-users.mjs
```

Queda matriculado automáticamente en el curso "Inglés conversacional"
(sembrado por `supabase/seed.sql`).

## Modo demo (sin Supabase configurado)

Ese login no pasa por Supabase Auth — es un modo aparte, cookie firmada en
memoria — así que sigue usando correo+contraseña normal para ambas cuentas:

```
DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASSWORD
DEMO_STUDENT_EMAIL / DEMO_STUDENT_PASSWORD
```

La pantalla de `/login` las lee de `/api/demo-auth/accounts` y muestra un
botón "Usar" por cuenta — automático mientras esas variables existan.

## Si perdiste los valores

Pídeselos a Claude — quedaron guardados en su memoria de este proyecto.

**Antes de cualquier entorno público con alumnos reales**: cambia estas
variables por credenciales nuevas (o elimínalas si ya no necesitas cuentas
de prueba), y borra ambas cuentas desde **Authentication → Users** en el
panel de Supabase.
