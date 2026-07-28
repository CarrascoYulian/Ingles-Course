// ============================================================================
// Crea los dos usuarios de prueba (administrador + estudiante) en un
// proyecto Supabase real, usando la Admin API (service role).
//
// Uso (después de aplicar las migraciones Y supabase/seed.sql — este script
// matricula al estudiante en un curso que debe existir ya):
//   node --env-file=.env.local scripts/seed-users.mjs
//
// Requiere en el entorno:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// El trigger `handle_new_user` (0001_schema.sql) crea automáticamente la
// fila en `profiles` a partir de `raw_user_meta_data` — este script sólo
// necesita llamar a la Admin API de Auth, no toca `profiles` directamente.
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Ejecuta con: node --env-file=.env.local scripts/seed-users.mjs',
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  {
    email: 'admin@inglesconmetodo.demo',
    password: 'Admin#2026',
    role: 'admin',
    full_name: 'Daniel Reyes',
    enrollment_code: null,
  },
  {
    email: 'estudiante@inglesconmetodo.demo',
    password: 'Estudiante#2026',
    role: 'student',
    full_name: 'Juan Carlos Peña',
    enrollment_code: 'ING-000072',
    level: 'B1',
  },
];

for (const user of USERS) {
  const { data, error } = await admin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: {
      role: user.role,
      full_name: user.full_name,
      enrollment_code: user.enrollment_code,
      level: user.level ?? null,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      console.log(`⏭  ${user.email} ya existía — se omite.`);
      continue;
    }
    console.error(`✗ Error creando ${user.email}:`, error.message);
    continue;
  }

  console.log(`✓ Creado ${user.role}: ${user.email} (id ${data.user.id})`);

  // Matricula al estudiante en el curso de ejemplo (supabase/seed.sql) para
  // que el panel del alumno no arranque completamente vacío.
  if (user.role === 'student') {
    const { error: enrollError } = await admin.from('enrollments').upsert(
      {
        student_id: data.user.id,
        course_id: '22222222-2222-2222-2222-222222222222', // Inglés conversacional
        progress: 54,
        watched_minutes: 18 * 60,
        completed_lessons: 41,
      },
      { onConflict: 'student_id,course_id' },
    );
    if (enrollError) console.error('  ⚠ No se pudo matricular al estudiante:', enrollError.message);
    else console.log('  ↳ Matriculado en "Inglés conversacional"');
  }
}

console.log('\nCredenciales de prueba:');
for (const user of USERS) {
  console.log(`  ${user.role.padEnd(10)} ${user.email}  /  ${user.password}`);
}
