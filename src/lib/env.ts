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
   * Autentica al Vercel Cron Job que llama a `/api/storage/reconcile`. Con
   * esta variable configurada en el proyecto de Vercel, la plataforma envía
   * `Authorization: Bearer <valor>` automáticamente en cada invocación
   * programada — sin ella, cualquiera podría disparar el borrado por HTTP.
   */
  CRON_SECRET: z.string().min(1).optional(),
  /**
   * Firma la cookie de sesión del modo demo. Sólo importa en desarrollo sin
   * Supabase: con Supabase configurado, la autenticación real de Supabase la
   * sustituye por completo y este secreto deja de usarse.
   *
   * El valor por defecto sólo se aplica fuera de producción: si el entorno
   * de producción quedara mal configurado (sin Supabase) y cayera a modo
   * demo, cualquiera podría firmar su propia cookie de admin con un secreto
   * público conocido. En producción, sin este valor explícito, el arranque
   * falla — falla cerrado en vez de exponer una puerta trasera silenciosa.
   */
  DEMO_AUTH_SECRET:
    process.env.NODE_ENV === 'production'
      ? z.string().min(1)
      : z.string().min(1).default('demo-secret-solo-para-desarrollo-local'),
  /**
   * Credenciales de las dos cuentas de prueba del modo demo. Antes vivían
   * como cadenas literales en `demo-session.ts` y en la pantalla de login —
   * visibles para cualquiera con acceso al código fuente (p. ej. en
   * GitHub). Ahora sólo existen en `.env.local` (gitignored).
   */
  DEMO_ADMIN_EMAIL: z.string().email().optional(),
  DEMO_ADMIN_PASSWORD: z.string().min(1).optional(),
  DEMO_STUDENT_EMAIL: z.string().email().optional(),
  DEMO_STUDENT_PASSWORD: z.string().min(1).optional(),
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
