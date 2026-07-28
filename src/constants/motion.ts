import type { Transition, Variants } from 'framer-motion';

/**
 * Vocabulario de movimiento del producto.
 *
 * Reglas que sigue todo el sistema:
 *  · Nada entra desde `scale(0)`: en el mundo real nada aparece de la nada.
 *  · `ease-in` nunca se usa en UI — retrasa el primer fotograma, que es
 *    justo el que el usuario está mirando.
 *  · Todo lo que se repite muchas veces al día no se anima.
 *  · Sólo se animan `transform` y `opacity` (saltan layout y paint).
 */

/** Curva ease-out fuerte. Las nativas de CSS son demasiado planas. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
/** Curva ease-in-out fuerte, para movimiento en pantalla (no entradas). */
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;

export const DURATION = {
  press: 0.16,
  hover: 0.16,
  popover: 0.18,
  dropdown: 0.2,
  dialog: 0.22,
  progress: 0.3,
} as const;

export const transitions = {
  /** Entradas y salidas de contenido. */
  enter: { duration: DURATION.dropdown, ease: EASE_OUT },
  /** Salidas: siempre más rápidas que las entradas. */
  exit: { duration: 0.14, ease: EASE_OUT },
  /** Diálogos. */
  dialog: { duration: DURATION.dialog, ease: EASE_OUT },
  /** Muelle contenido, para feedback de acierto/error. */
  spring: { type: 'spring', duration: 0.4, bounce: 0.18 },
} satisfies Record<string, Transition>;

/** Aparición de tarjetas y paneles: sube 10 px, como `dcSlide` del diseño. */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: transitions.enter },
  exit: { opacity: 0, y: 6, transition: transitions.exit },
};

/** Pop contenido, como `dcPop` del diseño. Nunca desde scale(0). */
export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: transitions.enter },
  exit: { opacity: 0, scale: 0.98, transition: transitions.exit },
};

/** Fundido puro: la única variante segura con `prefers-reduced-motion`. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.enter },
  exit: { opacity: 0, transition: transitions.exit },
};

/**
 * Cascada para listas. Retardo corto (40 ms): más lo haría sentir lento.
 * Nunca bloquea la interacción mientras se reproduce.
 */
export const stagger = (delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren } },
});
