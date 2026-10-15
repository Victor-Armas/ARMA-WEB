import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { getCommerceHistory } from "../services/adjustment.service";
export function useCommerceHistory(id: string) {
  const uid = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ["commerce-history", uid, id],
    queryFn: ({ signal }) => getCommerceHistory(id, signal),
    enabled: Boolean(uid),
    staleTime: 15000,
  });
}
