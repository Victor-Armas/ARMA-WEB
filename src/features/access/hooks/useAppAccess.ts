import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { getAppAccess } from "../services/access.service";

export function useAppAccess() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const query = useQuery({
    queryKey: ["app-access", userId],
    enabled: Boolean(userId),
    queryFn: ({ signal }) => getAppAccess(signal),
    staleTime: 15000,
    refetchInterval: 30000,
    refetchOnWindowFocus: "always",
  });
  return {
    ...query,
    can: (permission: string) =>
      query.data?.permissions.includes(permission) === true,
  };
}
