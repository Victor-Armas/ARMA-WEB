import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import {
  getCatalogPage,
  saveCatalog,
  setCatalogActive,
  uploadCatalogPhoto,
  catalogImageAction,
} from "../services/catalog.service";
import type { CatalogKind } from "../schemas/catalog.schema";
export function useCatalog(
  kind: CatalogKind,
  page: number,
  search: string,
  state: string,
  type: string,
) {
  const userId = useAuthStore((value) => value.session?.user.id);
  return useQuery({
    queryKey: ["catalog-admin", userId, kind, page, search, state, type],
    enabled: Boolean(userId),
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("Inicia sesión.");
      return getCatalogPage(kind, page, search, state, type, userId, signal);
    },
    staleTime: 15000,
    refetchInterval: (query) => {
      const at = query.state.data?.imageRefreshAt;
      return at ? Math.max(1000, at - Date.now()) : false;
    },
    placeholderData: (previous, query) =>
      query?.queryKey[1] === userId && query?.queryKey[2] === kind
        ? keepPreviousData(previous)
        : undefined,
  });
}
export function useCatalogMutations() {
  const client = useQueryClient();
  async function refresh() {
    await Promise.all(
      [
        "catalog-admin",
        "products",
        "product-detail",
        "materials",
        "workshop-options",
        "workshop-recipe",
        "business-dashboard",
        "workshop-recipes",
        "production-board",
      ].map((key) => client.invalidateQueries({ queryKey: [key] })),
    );
  }
  return {
    save: useMutation({
      mutationFn: saveCatalog,
      retry: false,
      onSuccess: refresh,
    }),
    active: useMutation({
      mutationFn: setCatalogActive,
      retry: false,
      onSuccess: refresh,
    }),
    imageAction: useMutation({
      mutationFn: catalogImageAction,
      retry: false,
      onSuccess: refresh,
      onError: refresh,
    }),
    photo: useMutation({
      mutationFn: uploadCatalogPhoto,
      retry: false,
      onSuccess: refresh,
    }),
  };
}
