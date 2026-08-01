import { z } from 'zod';

export const CEFR_ENROLLMENT_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;

export const inviteStudentSchema = z.object({
  fullName: z.string().trim().min(1, 'Escribe el nombre completo'),
  level: z.enum(CEFR_ENROLLMENT_LEVELS, { errorMap: () => ({ message: 'Elige un nivel' }) }),
  password: z.string().min(6, 'La contraseña tiene al menos 6 caracteres'),
});

export type InviteStudentValues = z.infer<typeof inviteStudentSchema>;

export const messageStudentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Escribe un mensaje')
    .max(2000, 'El mensaje no puede superar los 2000 caracteres'),
});

export type MessageStudentValues = z.infer<typeof messageStudentSchema>;
