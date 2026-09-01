import { z } from 'zod';

const optionSchema = z.object({
  id: z.string().min(1),
  key: z.enum(['A', 'B', 'C', 'D']),
  text: z.string().trim().min(1, 'Cada opción necesita texto').max(200),
});

/** Compartido por POST (crear) y PATCH (editar) — la forma no cambia entre ambos. */
export const practiceQuestionInputSchema = z
  .object({
    category: z.string().trim().min(1, 'La categoría es obligatoria').max(40),
    xpReward: z.number().int().min(1, 'La XP debe ser mayor a 0').max(200),
    prompt: z.string().trim().min(1, 'El enunciado es obligatorio').max(200),
    sourceText: z.string().trim().min(1, 'La frase a traducir es obligatoria').max(300),
    voice: z.enum(['female', 'male']).default('female'),
    options: z.array(optionSchema).length(4, 'Se necesitan exactamente 4 opciones'),
    correctOptionIds: z
      .array(z.string().min(1))
      .min(1, 'Marca al menos una respuesta correcta')
      .max(2, 'Como máximo 2 respuestas correctas'),
    explanationCorrect: z.string().trim().min(1, 'Falta la explicación de acierto').max(300),
    explanationWrong: z.string().trim().min(1, 'Falta la explicación de error').max(300),
  })
  .refine((data) => data.correctOptionIds.every((id) => data.options.some((option) => option.id === id)), {
    message: 'Las respuestas correctas deben ser una de las 4 opciones',
    path: ['correctOptionIds'],
  });
