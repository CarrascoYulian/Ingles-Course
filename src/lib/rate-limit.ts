/**
 * Limitador de tasa en memoria — ventana deslizante por clave (IP, email…).
 *
 * Limitación conocida: en memoria del proceso, así que en un despliegue con
 * varias instancias cada una lleva su propio contador (el límite real es
 * `intentos × nº de instancias`). Suficiente para frenar fuerza bruta
 * trivial contra el login demo; para un límite estricto multi-instancia
 * haría falta un backend compartido (Redis, Supabase).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** IP del cliente a partir de las cabeceras de proxy habituales. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}
