import { z } from 'zod';

import { CEFR_LEVELS } from '@/types';

/**
 * Esquema único para el formulario y para la validación de servidor.
 * Los mensajes están redactados para leerse bajo el campo, en español.
 */
export const createCourseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Ponle un nombre al curso para continuar')
    .max(80, 'El nombre no puede superar los 80 caracteres'),
  level: z.enum(CEFR_LEVELS, { message: 'Elige un nivel' }),
});

export type CreateCourseValues = z.infer<typeof createCourseSchema>;
