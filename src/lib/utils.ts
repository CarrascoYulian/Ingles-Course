import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Escala de font-size custom definida en src/styles/tokens.css (@theme).
// Sin esto, twMerge clasifica `text-body-lg`, `text-meta`, etc. como
// color de texto (el grupo por defecto para `text-*`) y los descarta si
// aparecen junto a una clase de color real (ej. `text-fg-body`).
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        'text-micro',
        'text-caption',
        'text-tiny',
        'text-meta',
        'text-label',
        'text-body-sm',
        'text-body',
        'text-body-lg',
        'text-title-xs',
        'text-title-sm',
        'text-title',
        'text-title-lg',
        'text-heading-sm',
        'text-heading',
        'text-heading-lg',
        'text-display-sm',
        'text-display',
        'text-display-lg',
      ],
    },
  },
});

/** Combina clases resolviendo conflictos de Tailwind. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
