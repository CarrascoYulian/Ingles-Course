import 'server-only';

/**
 * Antes `3` (corazones) y `10` (pasos por defecto) estaban repetidos como
 * literales sueltos en `session`, `answer` y `advance` — cambiar el número
 * de corazones del juego habría exigido tocar tres archivos a la vez.
 */
export const HEARTS_TOTAL = 3;

/** Sólo se usa si un nivel no tiene `total_steps` configurado en `practice_levels`. */
export const DEFAULT_TOTAL_STEPS = 10;

/**
 * Meta diaria de XP — mismo concepto que el "objetivo diario" de Duolingo.
 * Cumplirla el mismo día en que se cumplió ayer extiende la racha;
 * no cumplirla la reinicia. Fija por ahora (no hay todavía una pantalla de
 * ajustes donde el alumno elija su propia meta).
 */
export const DAILY_XP_GOAL = 30;

/** Escalón de XP acumulado en el que se otorga cada insignia. */
export const XP_BADGE_TIERS = [
  { threshold: 100, name: 'Primeros pasos' },
  { threshold: 250, name: 'Constancia' },
  { threshold: 500, name: 'Medio camino' },
  { threshold: 1000, name: 'Mil puntos' },
  { threshold: 2500, name: 'Políglota en marcha' },
  { threshold: 5000, name: 'Veterano' },
  { threshold: 10000, name: 'Leyenda' },
] as const;
