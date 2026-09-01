'use client';

import { Check, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { PracticeOption } from '@/types';

export type OptionState = 'idle' | 'selected' | 'correct' | 'incorrect';

export interface QuizOptionProps {
  option: PracticeOption;
  state: OptionState;
  disabled: boolean;
  onSelect: () => void;
  role?: 'radio' | 'checkbox';
}

const SHELL: Record<OptionState, string> = {
  idle: 'border border-slate-200 border-b-4 border-b-slate-300 bg-white text-slate-900 hover:bg-slate-50 hover:border-slate-300 active:border-b-0 active:translate-y-1',
  selected: 'border-2 border-blue-500 border-b-4 border-b-blue-700 bg-blue-50/90 text-blue-950 shadow-sm',
  correct: 'border-2 border-emerald-500 border-b-4 border-b-emerald-700 bg-emerald-50 text-emerald-950 shadow-glow-emerald',
  incorrect: 'border-2 border-rose-500 border-b-4 border-b-rose-700 bg-rose-50 text-rose-950',
};

const KEY_SHELL: Record<OptionState, string> = {
  idle: 'border border-slate-200 bg-slate-100 text-slate-700',
  selected: 'bg-brand text-white shadow-sm',
  correct: 'bg-emerald-500 text-white shadow-sm',
  incorrect: 'bg-rose-500 text-white shadow-sm',
};

/**
 * Opción de respuesta táctil 3D estilo Duolingo.
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
        'group flex w-full items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left md:px-5 md:py-4',
        'font-sans text-body md:text-body-lg font-extrabold',
        'cursor-pointer transition-all duration-100 ease-[cubic-bezier(0.23,1,0.32,1)]',
        'disabled:cursor-default',
        SHELL[state],
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-xl text-caption font-black font-mono',
          'transition-all duration-100',
          KEY_SHELL[state],
        )}
      >
        {state === 'correct' ? (
          <Check aria-hidden className="size-4.5 stroke-[3]" />
        ) : state === 'incorrect' ? (
          <X aria-hidden className="size-4.5 stroke-[3]" />
        ) : (
          option.key
        )}
      </span>
      <span className="flex-1 text-pretty">{option.text}</span>
    </button>
  );
}

