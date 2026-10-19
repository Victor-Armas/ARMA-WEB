import { signAppearanceAssets } from "@/features/collection-appearance/services/appearance-images.service";
import type { AppearanceAssetFiles } from "@/features/collection-appearance/schemas/appearance.schema";
import { publicCollectionSchema } from "@/features/storefront/services/collection.service";
import { getSignedProductImages } from "@/features/products/services/product-image-cache.service";
import { supabase } from "@/lib/supabase";
import {
  appearanceRecordSchema,
  appearanceSchema,
  type CollectionAppearance,
} from "@/features/collection-appearance/schemas/appearance.schema";
export async function getAppearanceAdmin(signal: AbortSignal) {
  const { data, error } = await supabase
    .rpc("get_collection_appearance_v2")
    .abortSignal(signal);
  if (error) throw error;
  const record = appearanceRecordSchema.parse(data);
  const urls = await signAppearanceAssets(record.appearance, async (path) => {
    const result = await supabase.storage
      .from("collection-artwork")
      .createSignedUrl(path, 3600);
    if (result.error) throw result.error;
    return result.data.signedUrl;
  });
  return { ...record, ...urls };
}

export async function publishAppearance(
  payload: CollectionAppearance,
  revision: string,
  files: AppearanceAssetFiles,
  userId: string,
) {
  const uploadedPaths: string[] = [];
  try {
    const appearance = appearanceSchema.parse(payload);
    const fields = [
      ["artwork", "artwork_path"],
      ["background", "background_path"],
      ["logo", "logo_path"],
    ] as const;
    for (const [kind, field] of fields) {
      const file = files[kind];
      if (!file) continue;
      const path = `${userId}/${crypto.randomUUID()}.webp`;
      const result = await supabase.storage
        .from("collection-artwork")
        .upload(path, file, {
          contentType: "image/webp",
          cacheControl: "31536000",
          upsert: false,
        });
      if (result.error) throw result.error;
      uploadedPaths.push(path);
      appearance[field] = path;
    }
    const { error } = await supabase.rpc("save_collection_appearance_v2", {
      p_payload: appearance,
      p_expected: revision,
    });
    if (error) throw error;
  } catch (error) {
    // Policies protect all three referenced assets if the save committed but its response was lost.
    if (uploadedPaths.length)
      await supabase.storage.from("collection-artwork").remove(uploadedPaths);
    throw error;
  }
}

export async function getCollectionPreview(
  userId: string,
  signal: AbortSignal,
) {
  const { data, error } = await supabase
    .rpc("collection_preview")
    .abortSignal(signal);
  if (error) throw error;
  const parsed = publicCollectionSchema.parse(data);
  const urls = await getSignedProductImages(
    parsed.items.flatMap((p) =>
      p.images.map((i) => i.thumbnail_path ?? i.storage_path),
    ),
    userId,
  );
  return {
    ...parsed,
    items: parsed.items.map((p) => ({
      ...p,
      photos: p.images.map((i) => ({
        id: i.id,
        url: urls.get(i.thumbnail_path ?? i.storage_path)?.url ?? null,
        alt: i.alt_text || p.name,
        caption: i.caption,
        background: i.background_color,
      })),
    })),
  };
}
