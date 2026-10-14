import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/stores/auth.store";
import { getStockProducts } from "../services/stock.service";

export function useStockProducts() {
  const userId = useAuthStore((state) => state.session?.user.id);

  return useQuery({
    queryKey: ["stock-products", userId],
    enabled: Boolean(userId),
    queryFn: ({ signal }) => getStockProducts(signal),
  });
}
