import { writeSeller } from "@/features/sellers/services/seller.service";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { notify } from "@/lib/notify";
import {
  commerceError,
  isRejectedOperation,
} from "@/features/commerce/services/commerce.service";
import {
  getWorkshopOptions,
  getWorkshopRecipe,
  getWorkshopHistory,
  writeWorkshop,
  adjustCommerce,
  getMaterialCostProfile,
  saveMaterialCost,
  getRecipesPage,
  getProductionBoard,
  getWorkshopVariant,
} from "../services/operations.service";
import type {
  WorkshopAction,
  OperationPayload,
  ProductionStatus,
} from "../schemas/operations.schema";
export function useWorkshopOptions(
  kind: "product" | "material" | "ready_product" | "seller_product",
  search: string,
) {
  const uid = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ["workshop-options", uid, kind, search],
    queryFn: ({ signal }) =>
      getWorkshopOptions(kind, search, signal, uid ?? ""),
    enabled: Boolean(uid),
    staleTime: 15000,
  });
}
export function useWorkshopRecipe(id: string) {
  const uid = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ["workshop-recipe", uid, id],
    queryFn: ({ signal }) => getWorkshopRecipe(id, signal, uid ?? ""),
    enabled: Boolean(uid && id),
    staleTime: 15000,
  });
}
export function useWorkshopHistory(
  kind: "receipts" | "production",
  page: number,
) {
  const uid = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ["workshop-history", uid, kind, page],
    queryFn: ({ signal }) => getWorkshopHistory(kind, page, signal),
    enabled: Boolean(uid),
    staleTime: 15000,
  });
}
// A network failure keeps exactly the same operation and identifier for a safe retry.
export function useOperation(
  action: WorkshopAction | "payment" | "return" | "cost" | "consignment",
  message: string,
) {
  const client = useQueryClient();
  const pending = useRef<OperationPayload | null>(null);
  const running = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  const [busy, setBusy] = useState(false);
  const mutation = useMutation({
    mutationKey: ["commerce-write"],
    retry: false,
    mutationFn: (payload: OperationPayload) =>
      action === "consignment"
        ? writeSeller(payload)
        : action === "cost"
          ? saveMaterialCost(payload)
          : action === "payment" || action === "return"
            ? adjustCommerce(action, payload)
            : writeWorkshop(action, payload),
  });
  async function execute(payload: OperationPayload): Promise<boolean> {
    if (running.current) return false;
    running.current = true;
    setBusy(true);
    const exact = pending.current ?? {
      ...payload,
      request_id: crypto.randomUUID(),
    };
    pending.current = exact;
    const toast = notify.loading("Guardando operación…");
    try {
      await mutation.mutateAsync(exact);
      pending.current = null;
      setUncertain(false);
      notify.success(message, { id: toast });
      return true;
    } catch (error: unknown) {
      if (isRejectedOperation(error)) {
        pending.current = null;
        setUncertain(false);
      } else {
        setUncertain(true);
      }
      notify.error(commerceError(error), { id: toast });
      return false;
    } finally {
      await Promise.all(
        [
          "seller-overview",
          "workshop-options",
          "material-cost-profile",
          "workshop-recipes",
          "production-board",
          "workshop-recipe",
          "workshop-history",
          "catalog-admin",
          "products",
          "product-detail",
          "commerce-orders",
          "commerce-history",
          "reservation-calendar",
          "business-dashboard",
        ].map((key) => client.invalidateQueries({ queryKey: [key] })),
      );
      running.current = false;
      setBusy(false);
    }
  }
  return {
    execute,
    busy,
    uncertain,
    retry: () =>
      pending.current ? execute(pending.current) : Promise.resolve(false),
  };
}

export function useMaterialCostProfile(id: string) {
  const uid = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ["material-cost-profile", uid, id],
    queryFn: ({ signal }) => getMaterialCostProfile(id, signal),
    enabled: Boolean(uid && id),
    staleTime: 15000,
  });
}

export function useRecipesPage(state: string, page: number, search: string) {
  const uid = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ["workshop-recipes", uid, state, page, search],
    queryFn: ({ signal }) =>
      getRecipesPage(state, page, search, uid ?? "", signal),
    enabled: Boolean(uid),
    staleTime: 15000,
    refetchInterval: 60000,
  });
}
export function useProductionBoard(
  status: ProductionStatus,
  page: number,
  search: string,
) {
  const uid = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ["production-board", uid, status, page, search],
    queryFn: ({ signal }) =>
      getProductionBoard(status, page, search, uid ?? "", signal),
    enabled: Boolean(uid),
    staleTime: 10000,
    refetchInterval: 15000,
  });
}

export function useWorkshopVariant(id?: string) {
  const uid = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ["workshop-options", uid, "selected", id],
    queryFn: ({ signal }) => getWorkshopVariant(id ?? "", uid ?? "", signal),
    enabled: Boolean(uid && id),
    staleTime: 15000,
  });
}
