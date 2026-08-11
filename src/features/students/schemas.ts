import { z } from 'zod';

export const CEFR_ENROLLMENT_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;

/**
 * El alumno entra con matrícula + PIN de 4 dígitos, no con una contraseña
 * de texto libre — más simple de recordar y compartir. Supabase Auth exige
 * contraseñas de al menos 6 caracteres, así que el servidor deriva la
 * contraseña real combinando la matrícula (única) con este PIN; el PIN
 * nunca se guarda ni se usa solo.
 */
export const inviteStudentSchema = z.object({
  fullName: z.string().trim().min(1, 'Escribe el nombre completo'),
  level: z.enum(CEFR_ENROLLMENT_LEVELS, { errorMap: () => ({ message: 'Elige un nivel' }) }),
  pin: z.string().regex(/^\d{4}$/, 'El PIN debe tener exactamente 4 dígitos'),
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
