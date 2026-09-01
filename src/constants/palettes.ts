import type { BlockType, CefrLevel } from '@/types';

/**
 * Paletas derivadas del diseño tecnológico moderno.
 */

/** Insignia de nivel MCER (píldora/cuadrado con las siglas). */
export const LEVEL_BADGE: Record<CefrLevel, string> = {
  A1: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80',
  A2: 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-800/80',
  B1: 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80',
  B2: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80',
  C1: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80',
};

/** Etiqueta del tipo de bloque en el constructor de contenido y sala de clase. */
export const BLOCK_BADGE: Record<BlockType, string> = {
  Video: 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/80',
  PDF: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700',
  Ejercicio: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/80',
  Audio: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/80',
  Evaluación: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/80',
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
