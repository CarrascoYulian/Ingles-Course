import { z } from 'zod';

export const inviteStudentSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Escribe un correo')
    .email('Ese correo no parece válido'),
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
