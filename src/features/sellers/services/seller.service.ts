import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { getSignedProductImages } from "@/features/products/services/product-image-cache.service";
import { sellerOverviewSchema } from "../schemas/seller.schema";
import type { OperationPayload } from "@/features/operations/schemas/operations.schema";
export async function getSellerOverview(
  seller: string | null,
  page: number,
  uid: string,
  signal: AbortSignal,
) {
  const { data, error } = await supabase
    .rpc("seller_overview", { p_seller: seller, p_page: page })
    .abortSignal(signal);
  if (error) throw error;
  const result = sellerOverviewSchema.parse(data);
  try {
    const urls = await getSignedProductImages(
      result.deliveries.flatMap((d) => (d.photo ? [d.photo.path] : [])),
      uid,
    );
    return {
      ...result,
      deliveries: result.deliveries.map((d) => ({
        ...d,
        photo_url: d.photo ? (urls.get(d.photo.path)?.url ?? null) : null,
      })),
    };
  } catch {
    return result;
  }
}
export async function writeSeller(payload: OperationPayload) {
  const { data, error } = await supabase.rpc("seller_write", {
    p_payload: payload,
  });
  if (error) throw error;
  return z.uuid().parse(data);
}

export async function setMyVariantPrice(input: {
  variantId: string;
  price: number | null;
}) {
  const { error } = await supabase.rpc("set_my_variant_price", {
    p_variant: input.variantId,
    p_price: input.price,
  });
  if (error) throw error;
}
