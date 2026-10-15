import { staffRoleSchema, type CreateRoleForm } from "../schemas/access.schema";
import { supabase } from "@/lib/supabase";
import {
  appAccessSchema,
  teamMembersSchema,
  sellerOptionsSchema,
  roleConfigSchema,
  type StaffRole,
} from "../schemas/access.schema";

export async function getAppAccess(signal: AbortSignal) {
  const { data, error } = await supabase.rpc("app_access").abortSignal(signal);
  if (error) throw error;
  return appAccessSchema.parse(data);
}
export async function getTeamMembers(signal: AbortSignal) {
  const { data, error } = await supabase
    .rpc("team_members")
    .abortSignal(signal);
  if (error) throw error;
  return teamMembersSchema.parse(data);
}
export async function getSellerOptions(signal: AbortSignal) {
  const { data, error } = await supabase
    .rpc("commerce_sellers")
    .abortSignal(signal);
  if (error) throw error;
  return sellerOptionsSchema.parse(data);
}

export async function getRoleConfig(signal: AbortSignal) {
  const { data, error } = await supabase
    .rpc("role_permissions_config")
    .abortSignal(signal);
  if (error) throw error;
  return roleConfigSchema.parse(data);
}
export async function setRolePermissions(input: {
  role: StaffRole;
  keys: string[];
}) {
  const { error } = await supabase.rpc("set_role_permissions", {
    p_role: input.role,
    p_keys: input.keys,
  });
  if (error) throw error;
}

export async function createTeamRole(
  input: CreateRoleForm & { requestId: string },
) {
  const { data, error } = await supabase.rpc("create_team_role", {
    p_request_id: input.requestId,
    p_name: input.name,
    p_description: input.description,
  });
  if (error) throw error;
  return staffRoleSchema.parse(data);
}
