import { z } from 'zod';

/**
 * Validación de entorno en el arranque. Falla rápido y con un mensaje claro
 * en lugar de romper en tiempo de ejecución con un `undefined`.
 *
 * Si faltan las credenciales de Supabase la app NO falla: arranca en modo
 * demo con datos en memoria. Es lo que permite clonar el repo y ver la
 * interfaz completa con un `npm run dev`, sin infraestructura.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  /**
   * Firma la cookie de sesión del modo demo. Sólo importa en desarrollo sin
   * Supabase: con Supabase configurado, la autenticación real de Supabase
   * la sustituye por completo y este secreto deja de usarse.
   */
  DEMO_AUTH_SECRET: z.string().min(1).default('demo-secret-solo-para-desarrollo-local'),
});

// Next inline-a `process.env.NEXT_PUBLIC_*` en el bundle del cliente sólo si
// se accede con notación de punto literal. Por eso no se itera process.env.
const parsedClient = clientSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

if (!parsedClient.success) {
  throw new Error(
    `Variables de entorno públicas inválidas:\n${parsedClient.error.issues
      .map((i) => ` · ${i.path.join('.')}: ${i.message}`)
      .join('\n')}`,
  );
}

export const clientEnv = parsedClient.data;

/** Sólo debe leerse desde código de servidor. */
export function getServerEnv() {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Variables de entorno de servidor inválidas:\n${parsed.error.issues
        .map((i) => ` · ${i.path.join('.')}: ${i.message}`)
        .join('\n')}`,
    );
  }
  return parsed.data;
}

/**
 * `true` cuando no hay Supabase configurado. Los servicios caen entonces al
 * adaptador en memoria (`services/demo`). Se evalúa igual en cliente y
 * servidor porque sólo depende de variables públicas.
 */
export const IS_DEMO_MODE =
  !clientEnv.NEXT_PUBLIC_SUPABASE_URL || !clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
