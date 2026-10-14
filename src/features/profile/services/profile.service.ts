import { supabase } from "@/lib/supabase";

import {
  profileSchema,
  userRoleRowsSchema,
  type CurrentProfile,
} from "../schema/profile.schema";

export async function getCurrentProfile(
  userId: string,
  signal: AbortSignal,
): Promise<CurrentProfile | null> {
  const [profileResult, rolesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, is_active")
      .eq("id", userId)
      .abortSignal(signal)
      .maybeSingle(),

    supabase
      .from("user_roles")
      .select("role:roles(id, code, name)")
      .eq("user_id", userId)
      .abortSignal(signal),
  ]);

  if (profileResult.error) {
    throw profileResult.error;
  }

  if (rolesResult.error) {
    throw rolesResult.error;
  }

  if (profileResult.data === null) {
    return null;
  }

  const profile = profileSchema.parse(profileResult.data);
  const assignments = userRoleRowsSchema.parse(rolesResult.data);

  const roles = assignments.flatMap(({ role }) =>
    role === null ? [] : [role],
  );

  return {
    ...profile,
    roles,
  };
}
