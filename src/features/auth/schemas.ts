import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Escribe tu correo o matrícula'),
  password: z.string().min(1, 'Escribe tu contraseña'),
});

export type LoginValues = z.infer<typeof loginSchema>;
