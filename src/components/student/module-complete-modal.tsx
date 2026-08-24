'use client';

import { motion } from 'framer-motion';
import { PartyPopper } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { transitions } from '@/constants/motion';
import { usePrefersReducedMotion } from '@/hooks/use-media-query';

export interface ModuleCompleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleTitle: string;
  /** No quedan más módulos por delante en este curso. */
  isLastModule: boolean;
  onContinue: () => void;
  /** Sólo se ofrece cuando `isLastModule` es verdadero — no hay certificado de un módulo suelto. */
  onViewCertificate?: () => void;
}

/**
 * Antes terminar el último video de un módulo no producía ningún aviso —
 * el alumno se quedaba mirando la última lección terminada sin ninguna
 * señal de que el módulo cerró, y sin ninguna forma de llegar al
 * siguiente (`getCurrentModule` tampoco lo resolvía, ver
 * `src/services/supabase/backend.ts`). Este modal es el cierre visible de
 * ese momento, con una sola acción clara para seguir.
 */
export function ModuleCompleteModal({
  open,
  onOpenChange,
  moduleTitle,
  isLastModule,
  onContinue,
  onViewCertificate,
}: ModuleCompleteModalProps) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={420}>
        <div className="flex flex-col items-center text-center">
          <motion.span
            aria-hidden
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            transition={reduceMotion ? transitions.enter : transitions.spring}
            className="grid size-16 place-items-center rounded-full bg-success-soft text-success-strong"
          >
            <PartyPopper aria-hidden size={30} strokeWidth={2} />
          </motion.span>

          <DialogTitle className="mt-4">
            {isLastModule ? '¡Terminaste el curso!' : `¡Terminaste “${moduleTitle}”!`}
          </DialogTitle>
          <p className="mt-1.5 text-body-sm font-medium leading-normal text-fg-soft">
            {isLastModule
              ? 'Viste todos los videos de todas las unidades. Tu docente puede ver tu progreso completo.'
              : 'Viste todos los videos de esta unidad. El siguiente ya te está esperando.'}
          </p>

          {isLastModule && onViewCertificate && (
            <Button variant="ghost" size="lg" className="mt-6 w-full font-extrabold" onClick={onViewCertificate}>
              Ver certificado
            </Button>
          )}
          <Button
            size="lg"
            className={isLastModule && onViewCertificate ? 'mt-2.5 w-full font-extrabold' : 'mt-6 w-full font-extrabold'}
            onClick={onContinue}
          >
            {isLastModule ? 'Volver a mis cursos' : 'Ir a la unidad siguiente'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
