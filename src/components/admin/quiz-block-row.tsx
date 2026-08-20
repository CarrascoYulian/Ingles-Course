'use client';

import { ClipboardCheck, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BLOCK_BADGE } from '@/constants/palettes';
import type { QuizDraft } from '@/types';

export interface QuizBlockRowProps {
  draft: QuizDraft;
  index: number;
  onEdit: () => void;
}

/**
 * Fila de resumen de la evaluación del módulo, al final de la lista de
 * bloques. No es un `Lesson`: el quiz vive en tablas separadas
 * (`getQuizDraft`/`saveQuizDraft`), así que esta fila no participa del
 * drag-and-drop ni de `onMove` — su posición es siempre la última, como
 * refuerza el texto del panel "Añadir bloque".
 */
export function QuizBlockRow({ draft, index, onEdit }: QuizBlockRowProps) {
  const questionCount = draft.questions.length;

  return (
    <li className="flex items-center gap-4 rounded-5xl border border-line bg-surface p-4">
      <span className="hidden w-[18px] shrink-0 md:block" aria-hidden />

      <div
        className={`grid size-20 shrink-0 place-items-center rounded-3xl ${BLOCK_BADGE.Evaluación}`}
      >
        <ClipboardCheck aria-hidden size={26} strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-bold text-fg md:text-body-lg">Evaluación del módulo</p>
        <p className="mt-0.5 text-tiny font-semibold text-fg-ghost md:text-meta">
          Bloque {index + 1} · {questionCount} {questionCount === 1 ? 'pregunta' : 'preguntas'} ·
          aprueba con {draft.passingScore}%
        </p>
      </div>

      <div className="flex shrink-0 gap-[5px] md:gap-1.5">
        <Button
          variant="icon"
          size="square"
          onClick={onEdit}
          aria-label="Editar la evaluación del módulo"
          title="Editar preguntas y puntaje mínimo"
          className="hover:border-brand hover:text-brand"
        >
          <Pencil aria-hidden size={13} strokeWidth={2.4} />
        </Button>
      </div>
    </li>
  );
}
