import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Escribe tu correo').email('Ese correo no parece válido'),
  password: z.string().min(8, 'La contraseña tiene al menos 8 caracteres'),
});

export type LoginValues = z.infer<typeof loginSchema>;
