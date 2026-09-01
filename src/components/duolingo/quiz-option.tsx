'use client';

import { cn } from '@/lib/utils';
import type { PracticeOption } from '@/types';

export type OptionState = 'idle' | 'selected' | 'correct' | 'incorrect';

export interface QuizOptionProps {
  option: PracticeOption;
  state: OptionState;
  disabled: boolean;
  onSelect: () => void;
  /** `radio` para preguntas de 1 respuesta, `checkbox` cuando se permite marcar varias. */
  role?: 'radio' | 'checkbox';
}

const SHELL: Record<OptionState, string> = {
  idle: 'border-line-strong bg-surface text-fg-strong hover:border-fg-placeholder',
  selected: 'border-accent bg-accent-tint text-accent-hover',
  correct: 'border-success bg-success-tint text-success-strong',
  incorrect: 'border-danger bg-danger-soft text-danger-strong',
};

const KEY: Record<OptionState, string> = {
  idle: 'bg-surface-sunken text-fg-dim',
  selected: 'bg-accent text-white',
  correct: 'bg-success text-white',
  incorrect: 'bg-danger text-white',
};

/**
 * Opción de respuesta.
 *
 * Se usa `role="radio"` en lugar de un botón suelto: el grupo se recorre con
 * las flechas y el lector anuncia «2 de 4». El resultado no depende sólo del
 * color — el estado también viaja en `aria-checked` y en el texto de
 * retroalimentación asociado.
 */
export function QuizOption({ option, state, disabled, onSelect, role = 'radio' }: QuizOptionProps) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={state !== 'idle'}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex items-center gap-[11px] rounded-4xl border-[1.5px] px-[15px] py-3.5 text-left md:gap-3 md:px-[18px] md:py-4',
        'font-sans text-body font-semibold leading-[1.4] md:text-body-lg',
        'cursor-pointer transition-[background-color,border-color,color,transform] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
        '[@media(hover:hover)_and_(pointer:fine)]:active:scale-[0.99]',
        'disabled:cursor-default',
        SHELL[state],
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-[26px] shrink-0 place-items-center rounded-sm text-meta font-extrabold',
          'transition-colors duration-[160ms]',
          KEY[state],
        )}
      >
        {option.key}
      </span>
      <span className="md:hidden">{option.shortText ?? option.text}</span>
      <span className="hidden md:inline">{option.text}</span>
    </button>
  );
}
