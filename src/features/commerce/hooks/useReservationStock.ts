import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { getReservationStockOptions } from "../services/reservation-stock.service";
export function useReservationStock(id: string) {
  const uid = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ["reservation-stock", uid, id],
    enabled: Boolean(uid),
    queryFn: ({ signal }) => getReservationStockOptions(id, signal),
    staleTime: 15000,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
    retry: false,
  });
}
