import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { clearProductImageCache } from "@/features/products/services/product-image-cache.service";
import { useAppAccess } from "./useAppAccess";

export function useAccessSync() {
  const access = useAppAccess();
  const client = useQueryClient();
  const previous = useRef<string | null>(null);
  const signature = access.data ? JSON.stringify(access.data) : null;
  useEffect(() => {
    if (signature === null) return;
    if (previous.current !== null && previous.current !== signature) {
      clearProductImageCache();
      void client
        .cancelQueries({
          predicate: (query) => query.queryKey[0] !== "app-access",
        })
        .then(() => {
          void client.resetQueries({
            predicate: (query) => query.queryKey[0] !== "app-access",
          });
        });
    }
    previous.current = signature;
  }, [signature, client]);
}
