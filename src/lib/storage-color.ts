/**
 * Color continuo de la barra de uso de Storage — azul sólido hasta el
 * umbral de advertencia, degradado azul→ámbar hasta el umbral crítico, y
 * degradado ámbar→rojo de ahí al 100%. Sin `server-only`: lo usa
 * `StorageUsageWidget` ('use client') directamente.
 *
 * Los tres colores son los mismos tokens de `src/styles/tokens.css`
 * (--color-accent, --color-warning, --color-danger) — no inventar hex
 * nuevos si esos cambian.
 */

type Rgb = readonly [number, number, number];

const BLUE: Rgb = [0x2f, 0x6b, 0xff]; // --color-accent
const ORANGE: Rgb = [0xf5, 0x9e, 0x0b]; // --color-warning
const RED: Rgb = [0xdc, 0x26, 0x26]; // --color-danger

function mix(from: Rgb, to: Rgb, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const channel = (a: number, b: number) => Math.round(a + (b - a) * clamped);
  return `rgb(${channel(from[0], to[0])}, ${channel(from[1], to[1])}, ${channel(from[2], to[2])})`;
}

export interface StorageBarColorThresholds {
  /** Empieza a virar de azul a ámbar en este porcentaje. */
  warningAt: number;
  /** Empieza a virar de ámbar a rojo en este porcentaje. */
  criticalAt: number;
}

export const DEFAULT_STORAGE_COLOR_THRESHOLDS: StorageBarColorThresholds = {
  warningAt: 65,
  criticalAt: 90,
};

export function storageBarColor(
  percent: number,
  thresholds: StorageBarColorThresholds = DEFAULT_STORAGE_COLOR_THRESHOLDS,
): string {
  const { warningAt, criticalAt } = thresholds;
  const clamped = Math.max(0, Math.min(100, percent));

  if (clamped <= warningAt) return mix(BLUE, BLUE, 0);
  if (clamped <= criticalAt) return mix(BLUE, ORANGE, (clamped - warningAt) / (criticalAt - warningAt));
  return mix(ORANGE, RED, (clamped - criticalAt) / (100 - criticalAt));
}
