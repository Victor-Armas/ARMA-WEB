import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/stores/auth.store";
import { getProducts } from "../services/product.service";

export function useProducts() {
  const userId = useAuthStore((state) => state.session?.user.id);

  return useQuery({
    queryKey: ["products", userId],
    enabled: Boolean(userId),
    queryFn: ({ signal }) => getProducts(signal),
  });
}
