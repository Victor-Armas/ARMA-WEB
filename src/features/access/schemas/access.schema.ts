import { z } from "zod";
export const staffRoleSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/);
export const appAccessSchema = z.object({
  roles: z.array(staffRoleSchema),
  permissions: z.array(z.string()),
});
export const teamMemberSchema = z.object({
  id: z.uuid(),
  full_name: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string(),
  is_active: z.boolean(),
  requires_change: z.boolean(),
  temporary_expired: z.boolean(),
  temporary_expires_at: z.string().nullable(),
  roles: z.array(staffRoleSchema),
});
export const teamMembersSchema = z.array(teamMemberSchema);
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type StaffRole = z.infer<typeof staffRoleSchema>;
export const sellerOptionsSchema = z.array(
  z.object({ id: z.uuid(), name: z.string(), is_active: z.boolean() }),
);
export const roleLabels: Record<string, string> = {
  owner: "Propietario",
  admin: "Admin",
  seller: "Vendedor",
};
export const memberFormSchema = z.object({
  email: z.email("Escribe un correo válido.").max(254),
  full_name: z.string().trim().min(2, "Escribe el nombre.").max(120),
  phone: z.string().trim().max(30),
  roles: z.array(staffRoleSchema).min(1, "Selecciona al menos un rol.").max(32),
});
export type MemberForm = z.infer<typeof memberFormSchema>;
export const temporaryCredentialSchema = z.object({
  user_id: z.uuid(),
  email: z.string(),
  temporary_password: z.string(),
  expires_at: z.string(),
});
export type TemporaryCredential = z.infer<typeof temporaryCredentialSchema>;
export const roleConfigSchema = z.object({
  permissions: z.array(
    z.object({ key: z.string(), module: z.string(), label: z.string() }),
  ),
  roles: z.array(
    z.object({
      code: staffRoleSchema,
      name: z.string().optional(),
      description: z.string().default(""),
      keys: z.array(z.string()),
    }),
  ),
});
export type RoleConfig = z.infer<typeof roleConfigSchema>;

export const createRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Escribe un nombre de al menos 2 caracteres.")
    .max(60),
  description: z.string().trim().max(250),
});
export type CreateRoleForm = z.infer<typeof createRoleSchema>;
export function getRoleLabel(code: string, roles: RoleConfig["roles"] = []) {
  return (
    roles.find((role) => role.code === code)?.name || roleLabels[code] || code
  );
}
