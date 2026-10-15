import { z } from "zod";
export const passwordChangeSchema = z
  .object({
    temporary: z.string().min(1, "Escribe la contraseña temporal.").max(128),
    password: z
      .string()
      .min(12, "Usa al menos 12 caracteres.")
      .max(64, "Usa hasta 64 caracteres.")
      .refine(
        (value) => new TextEncoder().encode(value).length <= 72,
        "La contraseña es demasiado larga.",
      ),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden.",
  })
  .refine((value) => value.password !== value.temporary, {
    path: ["password"],
    message: "Elige una contraseña diferente a la temporal.",
  });
export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;
export const accountGateSchema = z.object({
  is_active: z.boolean(),
  requires_change: z.boolean(),
  expired: z.boolean(),
  expires_at: z.string().nullable(),
  session_valid: z.boolean(),
});
