import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { getSignedProductImages } from "@/features/products/services/product-image-cache.service";
import {
  adminSchema,
  collectionFormSchema,
  offerFormSchema,
  type CollectionForm,
  type OfferForm,
} from "../schemas/collection.schema";
export async function getCollectionAdmin(userId: string, signal: AbortSignal) {
  const { data, error } = await supabase
    .rpc("collection_admin_data")
    .abortSignal(signal);
  if (error) throw error;
  const parsed = adminSchema.parse(data);
  const urls = await getSignedProductImages(
    parsed.products.flatMap((p) => p.images.map((i) => i.storage_path)),
    userId,
  );
  return { ...parsed, urls };
}
export async function saveCollection(
  payload: CollectionForm,
  revision: string,
) {
  const { error } = await supabase.rpc("save_collection", {
    p_payload: collectionFormSchema.parse(payload),
    p_expected: revision,
  });
  if (error) throw error;
}
export async function saveOffer(payload: OfferForm, revision: string | null) {
  const { error } = await supabase.rpc("save_collection_offer", {
    p_payload: offerFormSchema.parse(payload),
    p_expected: revision,
  });
  if (error) throw error;
}
export function collectionError(error: unknown) {
  const parsed = z
    .object({ code: z.string(), message: z.string() })
    .safeParse(error);
  return parsed.success &&
    ["40001", "42501", "P0001"].includes(parsed.data.code)
    ? parsed.data.message
    : "No pudimos guardar los cambios. Revisa los datos e inténtalo de nuevo.";
}
