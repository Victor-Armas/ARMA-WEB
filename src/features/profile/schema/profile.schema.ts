import { z } from "zod";

export const roleSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
});

export const profileSchema = z.object({
  id: z.uuid(),
  full_name: z.string().nullable(),
  is_active: z.boolean(),
});

export const userRoleRowsSchema = z.array(
  z.object({
    role: roleSchema.nullable(),
  }),
);

export const profileDisplaySchema = z.object({
  userId: z.uuid().nullable(),
  fullName: z.string().nullable(),
});

export type CurrentProfile = z.infer<typeof profileSchema> & {
  roles: Role[];
};
export type Role = z.infer<typeof roleSchema>;
export type ProfileDisplay = z.infer<typeof profileDisplaySchema>;
