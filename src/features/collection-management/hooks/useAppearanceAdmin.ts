import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { notify } from "@/lib/notify";
import {
  getAppearanceAdmin,
  getCollectionPreview,
  publishAppearance,
} from "../services/appearance-admin.service";
import { collectionError } from "../services/collection.service";
import type {
  CollectionAppearance,
  AppearanceAssetFiles,
} from "@/features/collection-appearance/schemas/appearance.schema";
export function useAppearanceAdmin(enabled: boolean) {
  const userId = useAuthStore((s) => s.session?.user.id);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["collection-appearance-admin", userId],
    enabled: enabled && !!userId,
    queryFn: ({ signal }) => getAppearanceAdmin(signal),
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const save = useMutation({
    mutationFn: ({
      payload,
      revision,
      files,
    }: {
      payload: CollectionAppearance;
      revision: string;
      files: AppearanceAssetFiles;
    }) => {
      if (!userId) throw new Error("Sesión requerida");
      return publishAppearance(payload, revision, files, userId);
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["collection-appearance-admin"] }),
        client.invalidateQueries({ queryKey: ["public-appearance"] }),
      ]);
      notify.success("Apariencia publicada");
    },
    onError: (e) => notify.error(collectionError(e)),
  });
  return { query, save };
}

export function useCollectionPreview() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ["collection-preview", userId],
    enabled: !!userId,
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("Sesión requerida");
      return getCollectionPreview(userId, signal);
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
