'use client';

import { Info, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { useAdminHeader } from '@/components/admin/admin-shell';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton, LoadingRegion } from '@/components/ui/skeleton';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import type { PracticeQuestionAdmin } from '@/types';
import { PracticeQuestionDialog } from './practice-question-dialog';
import {
  useCreatePracticeQuestion,
  useDeletePracticeQuestion,
  usePracticeQuestions,
  useUpdatePracticeQuestion,
} from '../hooks/use-practice-admin';

/**
 * Banco de preguntas de BerthoGo.
 *
 * Antes eran 80 preguntas fijas, escritas por el equipo y cargadas por
 * migración SQL. Ahora el profesor lo arma acá: un único banco compartido
 * (BerthoGo nunca estuvo segmentado por nivel de inglés — es el mismo juego
 * para todos los alumnos), y lo que escriba es lo que ven al jugar,
 * ciclando en el orden en que se agregaron.
 */
export function PracticeAdminView() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<PracticeQuestionAdmin | null>(null);

  const { data: questions, isPending } = usePracticeQuestions();
  const createQuestion = useCreatePracticeQuestion();
  const updateQuestion = useUpdatePracticeQuestion();
  const deleteQuestion = useDeletePracticeQuestion();
  const confirmDialog = useConfirmDialog();

  useAdminHeader(
    questions ? `${questions.length} pregunta${questions.length === 1 ? '' : 's'} en el banco` : 'Cargando…',
    () => {
      setEditingQuestion(null);
      setDialogOpen(true);
    },
  );

  return (
    <div className="flex flex-col gap-3 px-5 py-4 lg:gap-3.5 lg:px-[30px] lg:py-6">
      <Card radius="2xl" padding="none" className="flex items-start gap-3 border-none bg-brand-soft p-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-surface text-brand">
          <Info aria-hidden size={16} strokeWidth={2.2} />
        </span>
        <div className="text-label font-semibold text-fg-soft">
          <p className="font-bold text-fg-strong">Cómo funciona el banco</p>
          <p className="mt-1">
            Todos los alumnos juegan con el mismo banco de preguntas, sin importar su nivel — no
            hay pestañas por nivel de inglés, sólo la lista en el orden en que las agregás. El
            juego avanza pregunta por pregunta y, al llegar al final, vuelve a empezar desde la
            primera.
          </p>
          <p className="mt-1.5">
            Cada pregunta tiene 4 opciones (A-D) y podés marcar 1 o 2 como correctas — cualquiera
            de las marcadas cuenta como acierto para el alumno. La XP que asignes es lo que gana
            al acertar.
          </p>
        </div>
      </Card>

      {isPending && (
        <>
          <LoadingRegion label="Cargando preguntas del banco" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-4xl" />
          ))}
        </>
      )}

      {!isPending && (
        <>
        {questions && questions.length === 0 && (
          <EmptyState
            title="Todavía no hay preguntas"
            description="Agrega la primera para que BerthoGo tenga qué preguntarle al alumno. Podés cargar todas las que quieras: el juego las va ciclando en orden."
            action={
              <Button
                size="md"
                onClick={() => {
                  setEditingQuestion(null);
                  setDialogOpen(true);
                }}
              >
                Nueva pregunta
              </Button>
            }
          />
        )}

        <div className="flex flex-col gap-2.5">
          {questions?.map((question, index) => (
            <Card key={question.id} radius="2xl" padding="none" className="flex items-start gap-3 p-4">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-surface-sunken text-meta font-extrabold text-fg-dim">
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">{question.category}</Badge>
                  <span className="text-meta font-bold text-fg-ghost">+{question.xpReward} XP</span>
                </div>
                <p className="mt-1.5 text-body-sm font-bold text-fg-strong">{question.sourceText}</p>
                <p className="mt-0.5 text-label font-medium text-fg-soft">{question.prompt}</p>
                <p className="mt-1.5 text-caption font-semibold text-fg-ghost">
                  Correcta{question.correctOptionIds.length > 1 ? 's' : ''}:{' '}
                  {question.options
                    .filter((option) => question.correctOptionIds.includes(option.id))
                    .map((option) => option.key)
                    .join(' y ')}
                </p>
              </div>

              <div className="flex shrink-0 gap-1.5">
                <Button
                  variant="icon"
                  size="square"
                  aria-label={`Editar pregunta ${index + 1}`}
                  onClick={() => {
                    setEditingQuestion(question);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil aria-hidden size={13} strokeWidth={2.2} />
                </Button>
                <Button
                  variant="icon"
                  size="square"
                  aria-label={`Eliminar pregunta ${index + 1}`}
                  onClick={() =>
                    confirmDialog.confirm({
                      title: 'Eliminar pregunta',
                      body: 'El alumno ya no la verá en el juego. Esta acción no se puede deshacer.',
                      confirmLabel: 'Eliminar',
                      onConfirm: () => deleteQuestion.mutateAsync({ id: question.id }).then(() => undefined),
                    })
                  }
                >
                  <Trash2 aria-hidden size={13} strokeWidth={2.2} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
        </>
      )}

      <PracticeQuestionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        question={editingQuestion}
        pending={createQuestion.isPending || updateQuestion.isPending}
        onSubmit={(input) =>
          editingQuestion
            ? updateQuestion.mutateAsync({ id: editingQuestion.id, input })
            : createQuestion.mutateAsync(input)
        }
      />

      <ConfirmDialog
        request={confirmDialog.request}
        open={confirmDialog.isOpen}
        pending={confirmDialog.pending}
        onCancel={confirmDialog.dismiss}
        onConfirm={confirmDialog.accept}
      />
    </div>
  );
}
