'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuizToTake, useSubmitQuizAttempt } from '@/features/learning/hooks/use-quiz-taking';
import type { QuizAttempt } from '@/types';

export interface QuizTakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  moduleTitle: string;
  /** Botón "Continuar" del resultado aprobado — la navegación real la decide quien renderiza el diálogo. */
  onContinue: () => void;
}

/**
 * Intentos ilimitados (regla confirmada por el cliente): reprobar sólo
 * reinicia el formulario a las mismas preguntas, sin bloquear ningún botón
 * ni pedirle nada al docente.
 */
export function QuizTakeDialog({ open, onOpenChange, moduleId, moduleTitle, onContinue }: QuizTakeDialogProps) {
  const { data: quiz, isPending } = useQuizToTake(moduleId, open);
  const submitAttempt = useSubmitQuizAttempt(moduleId);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizAttempt | null>(null);

  useEffect(() => {
    if (open) {
      setAnswers({});
      setResult(null);
    }
  }, [open]);

  const allAnswered = Boolean(quiz) && quiz!.questions.every((question) => answers[question.id]);

  const handleSubmit = () => {
    submitAttempt.mutate(answers, { onSuccess: (attempt) => setResult(attempt) });
  };

  const handleRetry = () => {
    setAnswers({});
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={560}>
        <DialogTitle>Evaluación del módulo</DialogTitle>
        <DialogDescription>{moduleTitle}</DialogDescription>

        {isPending && (
          <div className="mt-4 flex flex-col gap-3">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
        )}

        {!isPending && quiz && !result && (
          <>
            <div className="mt-4 flex max-h-[50vh] flex-col gap-4 overflow-y-auto pr-1">
              {quiz.questions.map((question, index) => (
                <fieldset key={question.id} className="rounded-2xl border border-line bg-surface-muted p-3.5">
                  <legend className="px-0.5 text-body-sm font-bold text-fg">
                    {index + 1}. {question.prompt}
                  </legend>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {question.options.map((option) => (
                      <label
                        key={option.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-body-sm font-semibold text-fg hover:bg-surface"
                      >
                        <input
                          type="radio"
                          name={question.id}
                          checked={answers[question.id] === option.id}
                          onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: option.id }))}
                          className="size-4 shrink-0 cursor-pointer accent-accent"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-[9px]">
              <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              <Button
                size="md"
                className="font-extrabold"
                disabled={!allAnswered || submitAttempt.isPending}
                onClick={handleSubmit}
              >
                {submitAttempt.isPending ? 'Enviando…' : 'Enviar respuestas'}
              </Button>
            </div>
          </>
        )}

        {result && (
          <div className="mt-5 flex flex-col items-center text-center">
            <span
              aria-hidden
              className={
                result.passed
                  ? 'grid size-14 place-items-center rounded-full bg-success-soft text-success-strong'
                  : 'grid size-14 place-items-center rounded-full bg-danger-soft text-danger-strong'
              }
            >
              {result.passed ? (
                <CheckCircle2 aria-hidden size={28} strokeWidth={2} />
              ) : (
                <XCircle aria-hidden size={28} strokeWidth={2} />
              )}
            </span>
            <p className="mt-3 text-title font-extrabold text-fg">{Math.round(result.score)} %</p>
            <p className="mt-1 text-body-sm font-semibold text-fg-soft">
              {result.passed
                ? 'Aprobaste la evaluación del módulo.'
                : 'No llegaste al puntaje mínimo — podés intentarlo de nuevo cuando quieras.'}
            </p>

            <div className="mt-5 flex w-full gap-[9px]">
              {result.passed ? (
                <Button
                  size="lg"
                  className="w-full font-extrabold"
                  onClick={() => {
                    onOpenChange(false);
                    onContinue();
                  }}
                >
                  Continuar
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="lg" className="w-full" onClick={() => onOpenChange(false)}>
                    Cerrar
                  </Button>
                  <Button size="lg" className="w-full font-extrabold" onClick={handleRetry}>
                    Intentar de nuevo
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
