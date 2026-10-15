import { useSearchParams } from "react-router";
import { useAppAccess } from "@/features/access/hooks/useAppAccess";
import type { ProductScope } from "../schemas/product.schema";
export function useProductScope() {
  const access = useAppAccess();
  const [params] = useSearchParams();
  const raw = params.get("scope");
  const scope: ProductScope =
    raw === "mine" || raw === "warehouse" || raw === "catalog"
      ? raw
      : access.can("inventory.sell_workshop")
        ? "warehouse"
        : "mine";
  return { scope, canUseWarehouse: access.can("inventory.sell_workshop") };
}
