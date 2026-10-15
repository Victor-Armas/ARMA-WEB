import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { clearProductImageCache } from "@/features/products/services/product-image-cache.service";
import {
  createTeamRole,
  getTeamMembers,
  getSellerOptions,
  getRoleConfig,
  setRolePermissions,
} from "../services/access.service";

export function useTeam(enabled: boolean) {
  const userId = useAuthStore((state) => state.session?.user.id);
  return useQuery({
    queryKey: ["team", userId],
    enabled: enabled && Boolean(userId),
    queryFn: ({ signal }) => getTeamMembers(signal),
    staleTime: 15000,
  });
}
export function useSellerOptions(enabled: boolean) {
  const userId = useAuthStore((state) => state.session?.user.id);
  return useQuery({
    queryKey: ["seller-options", userId],
    enabled: enabled && Boolean(userId),
    queryFn: ({ signal }) => getSellerOptions(signal),
    staleTime: 15000,
  });
}

export function useRoleConfig(enabled: boolean) {
  const userId = useAuthStore((state) => state.session?.user.id);
  return useQuery({
    queryKey: ["role-config", userId],
    enabled: enabled && Boolean(userId),
    queryFn: ({ signal }) => getRoleConfig(signal),
    staleTime: 15000,
  });
}
export function useSetRolePermissions() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: setRolePermissions,
    retry: false,
    onSuccess: async () => {
      clearProductImageCache();
      await client.invalidateQueries();
    },
  });
}

export function useCreateTeamRole() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createTeamRole,
    retry: false,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["role-config"] });
    },
  });
}
