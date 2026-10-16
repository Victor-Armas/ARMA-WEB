import { useQuery } from "@tanstack/react-query";
import { getPublicCollection } from "../services/collection.service";
export function usePublicCollection() {
  return useQuery({
    queryKey: ["public-collection"],
    queryFn: ({ signal }) => getPublicCollection(signal),
    staleTime: 60000,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    retry: false,
  });
}
