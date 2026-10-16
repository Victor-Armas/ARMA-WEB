import { useQuery } from "@tanstack/react-query";
import { getStorefrontPage } from "../services/storefront.service";
import type { CatalogFilters } from "../schemas/storefront.schema";

export const initialCatalogFilters: CatalogFilters = {
  page: 1,
  search: "",
  size: "",
  color: "",
};
export function useStorefront(
  filters: CatalogFilters = initialCatalogFilters,
  id?: string,
) {
  return useQuery({
    queryKey: ["public-catalog", filters, id ?? null],
    queryFn: ({ signal }) => getStorefrontPage(filters, signal, id),
    placeholderData: (previous, query) =>
      query?.queryKey[2] === (id ?? null) ? previous : undefined,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchInterval: 30 * 60_000,
    refetchOnWindowFocus: true,
    retry: 0,
  });
}
