import { z } from 'zod';

export const practiceQuestionFormSchema = z.object({
  category: z.string().trim().min(1, 'La categoría es obligatoria').max(40),
  xpReward: z
    .number({ message: 'La XP es obligatoria' })
    .int('La XP debe ser un número entero')
    .min(1, 'La XP debe ser mayor a 0')
    .max(200, 'Máximo 200 XP'),
  prompt: z.string().trim().min(1, 'El enunciado es obligatorio').max(200),
  sourceText: z.string().trim().min(1, 'La frase a traducir es obligatoria').max(300),
  voice: z.enum(['female', 'male']),
  optionA: z.string().trim().min(1, 'Falta el texto de la opción A').max(200),
  optionB: z.string().trim().min(1, 'Falta el texto de la opción B').max(200),
  optionC: z.string().trim().min(1, 'Falta el texto de la opción C').max(200),
  optionD: z.string().trim().min(1, 'Falta el texto de la opción D').max(200),
  correctKeys: z
    .array(z.enum(['A', 'B', 'C', 'D']))
    .min(1, 'Marca al menos una respuesta correcta')
    .max(2, 'Como máximo 2 respuestas correctas'),
  explanationCorrect: z.string().trim().min(1, 'Falta la explicación de acierto').max(300),
  explanationWrong: z.string().trim().min(1, 'Falta la explicación de error').max(300),
});

export type PracticeQuestionFormValues = z.infer<typeof practiceQuestionFormSchema>;

export const EMPTY_PRACTICE_QUESTION_FORM: PracticeQuestionFormValues = {
  category: '',
  xpReward: 20,
  prompt: 'Elige la traducción correcta',
  sourceText: '',
  voice: 'female',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctKeys: [],
  explanationCorrect: '',
  explanationWrong: '',
};
