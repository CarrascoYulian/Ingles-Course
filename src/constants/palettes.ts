import type { BlockType, CefrLevel } from '@/types';

/**
 * Paletas derivadas del diseño. Se declaran como clases de Tailwind completas
 * (nunca interpoladas) para que el compilador de Tailwind pueda verlas.
 */

/** Insignia de nivel MCER (cuadrado con las siglas). */
export const LEVEL_BADGE: Record<CefrLevel, string> = {
  A1: 'bg-brand-soft text-brand',
  A2: 'bg-surface-sunken text-fg-subtle',
  B1: 'bg-accent-soft text-accent',
  B2: 'bg-warning-tint text-warning-strong',
  C1: 'bg-violet-soft text-violet-strong',
};

/** Etiqueta cuadrada del tipo de bloque en el constructor de contenido. */
export const BLOCK_BADGE: Record<BlockType, string> = {
  Video: 'bg-accent-soft text-accent',
  PDF: 'bg-surface-sunken text-fg-subtle',
  Ejercicio: 'bg-brand-soft text-brand',
  Audio: 'bg-violet-soft text-violet-strong',
  Evaluación: 'bg-warning-tint text-warning-strong',
};

/** Colores de avatar, en el orden exacto del diseño. */
export const AVATAR_COLORS = [
  '#0F5257',
  '#2F6BFF',
  '#7A5AF8',
  '#0EA5A8',
  '#475569',
  '#B4790C',
] as const;

export function avatarColorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}

/**
 * Color de la barra de progreso: verde por encima de 70, azul entre 30 y 70,
 * ámbar por debajo. Es la regla literal del diseño.
 */
export function progressTone(value: number): 'success' | 'accent' | 'warning' {
  if (value > 70) return 'success';
  if (value > 30) return 'accent';
  return 'warning';
}
