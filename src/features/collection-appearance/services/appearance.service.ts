import { signAppearanceAssets } from "./appearance-images.service";
import { publicSupabase } from "@/lib/supabase-public";
import { appearanceRecordSchema } from "../schemas/appearance.schema";
export async function getPublicAppearance(signal: AbortSignal) {
  const { data, error } = await publicSupabase
    .rpc("collection_appearance_public_v2")
    .abortSignal(AbortSignal.any([signal, AbortSignal.timeout(15000)]));
  if (error) throw error;
  const record = appearanceRecordSchema.parse(data);
  const urls = await signAppearanceAssets(record.appearance, async (path) => {
    const result = await publicSupabase.storage
      .from("collection-artwork")
      .createSignedUrl(path, 3600);
    return result.error ? null : result.data.signedUrl;
  });
  return { ...record, ...urls };
}
