import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { getDashboard } from "../services/dashboard.service";
export function useDashboard(from: string, to: string) {
  const uid = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ["business-dashboard", uid, from, to],
    queryFn: ({ signal }) => getDashboard(from, to, signal),
    enabled: Boolean(uid),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}
