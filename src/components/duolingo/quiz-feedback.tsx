'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';

import { transitions } from '@/constants/motion';
import { usePrefersReducedMotion } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import type { AnswerResult } from '@/services';

export interface QuizFeedbackProps {
  result: AnswerResult | null;
  hasSelection: boolean;
  correctKey: string;
  xpReward: number;
}

/**
 * Resultado del ejercicio.
 *
 * Es de las pocas animaciones del producto que se permite un muelle: aparece
 * una vez cada varios segundos, cierra un momento de tensión y el rebote
 * (bounce 0.18, muy contenido) hace que se sienta como una respuesta y no
 * como un cartel.
 *
 * `role="status"` lo anuncia al lector de pantalla sin robar el foco.
 */
export function QuizFeedback({ result, hasSelection, correctKey, xpReward }: QuizFeedbackProps) {
  const reduceMotion = usePrefersReducedMotion();

  if (!result) {
    return (
      <p role="status" className="text-body-sm font-semibold text-fg-ghost">
        {hasSelection
          ? 'Pulsa comprobar para validar tu respuesta.'
          : 'Selecciona una opción para comprobar.'}
      </p>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={result.correct ? 'ok' : result.partial ? 'partial' : 'ko'}
        role="status"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        transition={reduceMotion ? transitions.enter : transitions.spring}
        className="flex items-start gap-[11px]"
      >
        <span
          aria-hidden
          className={cn(
            'grid size-6 shrink-0 place-items-center rounded-full text-label font-extrabold text-white',
            result.correct ? 'bg-success' : result.partial ? 'bg-warning' : 'bg-danger',
          )}
        >
          {result.correct ? <Check size={13} strokeWidth={3} /> : '!'}
        </span>

        <div className="min-w-0">
          <p
            className={cn(
              'text-body font-extrabold',
              result.correct
                ? 'text-success-strong'
                : result.partial
                  ? 'text-warning-strong'
                  : 'text-danger-strong',
            )}
          >
            {result.correct
              ? `¡Correcto! +${xpReward} XP`
              : result.partial
                ? `Casi. Sólo acertaste una parte. +${result.xpGained} XP`
                : `Casi. La respuesta correcta es la ${correctKey}`}
          </p>
          <p className="mt-0.5 text-label font-medium leading-[1.45] text-fg-soft">
            {result.explanation}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
