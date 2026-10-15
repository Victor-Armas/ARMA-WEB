import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setMyVariantPrice } from "../services/seller.service";
export function usePersonalPrice() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: setMyVariantPrice,
    retry: false,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["products"] }),
        client.invalidateQueries({ queryKey: ["product-detail"] }),
      ]);
    },
  });
}
