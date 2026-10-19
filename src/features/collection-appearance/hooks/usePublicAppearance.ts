import { useQuery } from "@tanstack/react-query";
import { getPublicAppearance } from "../services/appearance.service";
export function usePublicAppearance() {
  return useQuery({
    queryKey: ["public-appearance"],
    queryFn: ({ signal }) => getPublicAppearance(signal),
    staleTime: 30000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    retry: false,
  });
}
