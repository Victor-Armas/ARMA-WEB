import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { notify } from "@/lib/notify";
import {
  getCollectionAdmin,
  saveCollection,
  saveOffer,
  collectionError,
} from "../services/collection.service";
import type { CollectionForm, OfferForm } from "../schemas/collection.schema";
export function useCollectionAdmin(enabled: boolean) {
  const userId = useAuthStore((s) => s.session?.user.id);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["collection-admin", userId],
    enabled: enabled && Boolean(userId),
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("Sesión requerida");
      return getCollectionAdmin(userId, signal);
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  async function saved() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["collection-admin"] }),
      client.invalidateQueries({ queryKey: ["public-collection"] }),
      client.invalidateQueries({ queryKey: ["public-catalog"] }),
    ]);
    notify.success("Cambios guardados");
  }
  const configuration = useMutation({
    mutationFn: ({
      payload,
      revision,
    }: {
      payload: CollectionForm;
      revision: string;
    }) => saveCollection(payload, revision),
    onSuccess: saved,
    onError: (e) => notify.error(collectionError(e)),
  });
  const offer = useMutation({
    mutationFn: ({
      payload,
      revision,
    }: {
      payload: OfferForm;
      revision: string | null;
    }) => saveOffer(payload, revision),
    onSuccess: saved,
    onError: (e) => notify.error(collectionError(e)),
  });
  return { query, configuration, offer };
}
