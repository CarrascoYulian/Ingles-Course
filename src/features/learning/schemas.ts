import { z } from 'zod';

export const createModuleSchema = z.object({
  courseId: z.string().min(1, 'Elige un curso'),
  title: z
    .string()
    .trim()
    .min(1, 'Ponle un título al módulo para continuar')
    .max(80, 'El título no puede superar los 80 caracteres'),
});

export type CreateModuleValues = z.infer<typeof createModuleSchema>;
