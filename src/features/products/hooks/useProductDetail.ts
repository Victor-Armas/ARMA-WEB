import type { ProductScope } from "../schemas/product.schema";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { getProductDetail } from "../services/product.service";

export function useProductDetail(
  productId: string | undefined,
  scope: ProductScope,
) {
  const userId = useAuthStore((state) => state.session?.user.id);
  const isValidId = z.uuid().safeParse(productId).success;
  const query = useQuery({
    queryKey: ["product-detail", userId, productId, scope],
    enabled: Boolean(userId) && isValidId,
    queryFn: ({ signal }) => {
      if (!productId || !isValidId || !userId)
        throw new Error("Producto inválido.");
      return getProductDetail(productId, scope, userId, signal);
    },
    staleTime: 60_000,
    refetchInterval: (query) => {
      const refreshAt = query.state.data?.imageRefreshAt;
      return refreshAt ? Math.max(1_000, refreshAt - Date.now()) : false;
    },
    refetchOnWindowFocus: "always",
  });
  return { ...query, isValidId };
}
