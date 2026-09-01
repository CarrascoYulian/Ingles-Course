import type { BlockType, CefrLevel } from '@/types';

/**
 * Paletas derivadas del diseño tecnológico moderno.
 */

/** Insignia de nivel MCER (píldora/cuadrado con las siglas). */
export const LEVEL_BADGE: Record<CefrLevel, string> = {
  A1: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
  A2: 'bg-cyan-50 text-cyan-700 border border-cyan-200/80',
  B1: 'bg-blue-50 text-blue-700 border border-blue-200/80',
  B2: 'bg-amber-50 text-amber-700 border border-amber-200/80',
  C1: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
};

/** Etiqueta del tipo de bloque en el constructor de contenido y sala de clase. */
export const BLOCK_BADGE: Record<BlockType, string> = {
  Video: 'bg-blue-50 text-blue-700 border border-blue-200/60',
  PDF: 'bg-slate-100 text-slate-700 border border-slate-200/80',
  Ejercicio: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  Audio: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
  Evaluación: 'bg-amber-50 text-amber-700 border border-amber-200/60',
};

/** Colores de avatar tecnológicos y vibrantes. */
export const AVATAR_COLORS = [
  '#2563EB', // Electric Blue
  '#6366F1', // Indigo
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#8B5CF6', // Violet
  '#F59E0B', // Amber
  '#0D9488', // Teal
] as const;

export function avatarColorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}

/**
 * Color de la barra de progreso: verde esmeralda > 70%, azul cobalto 30-70%, ámbar < 30%.
 */
export function progressTone(value: number): 'success' | 'accent' | 'warning' {
  if (value > 70) return 'success';
  if (value > 30) return 'accent';
  return 'warning';
}
