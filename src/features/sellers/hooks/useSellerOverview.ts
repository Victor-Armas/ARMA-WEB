import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { useAppAccess } from "@/features/access/hooks/useAppAccess";
import { getSellerOverview } from "../services/seller.service";
export function useSellerOverview(seller: string | null = null, page = 1) {
  const uid = useAuthStore((s) => s.session?.user.id);
  const access = useAppAccess();
  return useQuery({
    queryKey: ["seller-overview", uid, seller, page],
    queryFn: ({ signal }) => getSellerOverview(seller, page, uid ?? "", signal),
    enabled:
      Boolean(uid) &&
      (access.can("consignments.read") || access.can("consignments.manage")),
    staleTime: 15000,
    refetchInterval: 60000,
  });
}
