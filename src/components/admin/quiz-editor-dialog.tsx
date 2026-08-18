'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { QuizDraft, QuizQuestionDraft } from '@/types';

export interface QuizEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleTitle: string;
  draft: QuizDraft | null | undefined;
  pending?: boolean;
  removePending?: boolean;
  canRemove: boolean;
  onSave: (draft: QuizDraft) => void;
  onRemove: () => void;
}

function emptyQuestion(): QuizQuestionDraft {
  return {
    prompt: '',
    options: [
      { label: '', isCorrect: true },
      { label: '', isCorrect: false },
    ],
  };
}

/** Sólo opción múltiple en esta primera versión — ver memoria del proyecto sobre evaluación real. */
function validate(draft: QuizDraft): string | null {
  if (draft.passingScore < 0 || draft.passingScore > 100) return 'El puntaje mínimo debe estar entre 0 y 100';
  if (draft.questions.length === 0) return 'Agrega al menos una pregunta';
  for (const question of draft.questions) {
    if (!question.prompt.trim()) return 'Todas las preguntas necesitan un enunciado';
    if (question.options.length < 2) return 'Cada pregunta necesita al menos dos opciones';
    if (question.options.some((option) => !option.label.trim())) return 'Ninguna opción puede quedar vacía';
    if (!question.options.some((option) => option.isCorrect)) return 'Marca la opción correcta de cada pregunta';
  }
  return null;
}

/**
 * Autoría simple: reemplazo completo al guardar (ver `saveQuizDraft` en los
 * backends) — no hace falta un editor con historial de cambios para un quiz
 * de módulo con pocas preguntas.
 */
export function QuizEditorDialog({
  open,
  onOpenChange,
  moduleTitle,
  draft,
  pending,
  removePending,
  canRemove,
  onSave,
  onRemove,
}: QuizEditorDialogProps) {
  const [passingScore, setPassingScore] = useState(70);
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>([emptyQuestion()]);

  useEffect(() => {
    if (!open) return;
    setPassingScore(draft?.passingScore ?? 70);
    setQuestions(draft?.questions?.length ? structuredClone(draft.questions) : [emptyQuestion()]);
  }, [open, draft]);

  const updateQuestion = (index: number, next: QuizQuestionDraft) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? next : q)));
  };

  const handleSave = () => {
    const nextDraft: QuizDraft = { passingScore, questions };
    const error = validate(nextDraft);
    if (error) {
      toast.error(error);
      return;
    }
    onSave(nextDraft);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={560}>
        <DialogTitle>Evaluación del módulo</DialogTitle>
        <DialogDescription>{moduleTitle}</DialogDescription>

        <div className="mt-4 max-h-[55vh] overflow-y-auto pr-1">
          <Field label="Puntaje mínimo para aprobar (%)" className="mb-4 max-w-[160px]">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="number"
                min={0}
                max={100}
                value={passingScore}
                onChange={(event) => setPassingScore(Number(event.target.value))}
              />
            )}
          </Field>

          <div className="flex flex-col gap-4">
            {questions.map((question, qIndex) => (
              <div key={qIndex} className="rounded-2xl border border-line bg-surface-muted p-3.5">
                <div className="flex items-start gap-2">
                  <Input
                    value={question.prompt}
                    placeholder={`Pregunta ${qIndex + 1}`}
                    onChange={(event) =>
                      updateQuestion(qIndex, { ...question, prompt: event.target.value })
                    }
                  />
                  <Button
                    variant="icon"
                    size="square"
                    aria-label="Eliminar pregunta"
                    onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qIndex))}
                    disabled={questions.length === 1}
                    className="shrink-0 hover:border-danger-line hover:text-danger-strong"
                  >
                    <Trash2 aria-hidden size={13} strokeWidth={2.2} />
                  </Button>
                </div>

                <div className="mt-2.5 flex flex-col gap-2">
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={option.isCorrect}
                        onChange={() =>
                          updateQuestion(qIndex, {
                            ...question,
                            options: question.options.map((o, i) => ({ ...o, isCorrect: i === oIndex })),
                          })
                        }
                        aria-label={`Marcar como correcta la opción ${oIndex + 1}`}
                        className="size-4 shrink-0 cursor-pointer accent-accent"
                      />
                      <Input
                        value={option.label}
                        placeholder={`Opción ${oIndex + 1}`}
                        onChange={(event) =>
                          updateQuestion(qIndex, {
                            ...question,
                            options: question.options.map((o, i) =>
                              i === oIndex ? { ...o, label: event.target.value } : o,
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        aria-label="Eliminar opción"
                        disabled={question.options.length <= 2}
                        onClick={() =>
                          updateQuestion(qIndex, {
                            ...question,
                            options: question.options.filter((_, i) => i !== oIndex),
                          })
                        }
                        className="shrink-0 text-fg-faint hover:text-danger-strong disabled:opacity-30"
                      >
                        <Trash2 aria-hidden size={13} strokeWidth={2.2} />
                      </button>
                    </div>
                  ))}
                  <Button
                    variant="quiet"
                    size="xs"
                    className="w-fit"
                    onClick={() =>
                      updateQuestion(qIndex, {
                        ...question,
                        options: [...question.options, { label: '', isCorrect: false }],
                      })
                    }
                  >
                    <Plus aria-hidden size={12} strokeWidth={2.4} />
                    Agregar opción
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="dashed"
            size="sm"
            className="mt-3 w-full"
            onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
          >
            <Plus aria-hidden size={14} strokeWidth={2.4} />
            Agregar pregunta
          </Button>
        </div>

        <DialogFooter className="items-center sm:justify-between">
          {canRemove && draft ? (
            <Button variant="danger" size="md" disabled={removePending} onClick={onRemove}>
              {removePending ? 'Eliminando…' : 'Eliminar evaluación'}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-[9px]">
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button size="md" className="font-extrabold" disabled={pending} onClick={handleSave}>
              {pending ? 'Guardando…' : 'Guardar evaluación'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
