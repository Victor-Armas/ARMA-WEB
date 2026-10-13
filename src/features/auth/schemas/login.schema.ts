import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().min(1, { error: 'Ingresa tu correo electrónico' })
    .pipe(z.email({ error: 'Ingresa un correo electrónico válido' })),
  password: z.string().min(1, { error: 'Ingresa tu contraseña' }),
});

export type LoginFormInput = z.input<typeof loginSchema>;
export type LoginFormData = z.output<typeof loginSchema>;
