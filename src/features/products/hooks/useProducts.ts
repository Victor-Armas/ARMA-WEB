import type { ProductScope } from "../schemas/product.schema";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { getProducts } from "../services/product.service";

export function useProducts(page: number, search: string, scope: ProductScope) {
  const userId = useAuthStore((state) => state.session?.user.id);
  return useQuery({
    queryKey: ["products", userId, page, search, scope],
    enabled: Boolean(userId),
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("No hay una sesión activa.");
      return getProducts(page, scope, search, userId, signal);
    },
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === userId &&
      previousQuery?.queryKey[4] === scope
        ? keepPreviousData(previousData)
        : undefined,
    staleTime: 60_000,
    refetchInterval: (query) => {
      const refreshAt = query.state.data?.imageRefreshAt;
      return refreshAt ? Math.max(1_000, refreshAt - Date.now()) : false;
    },
  });
}
