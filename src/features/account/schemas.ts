import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, 'Escribe el nombre completo'),
});

export type UpdateProfileValues = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const inviteStaffSchema = z.object({
  fullName: z.string().trim().min(1, 'Escribe el nombre completo'),
  email: z.string().trim().email('Escribe un correo válido'),
});

export type InviteStaffValues = z.infer<typeof inviteStaffSchema>;
