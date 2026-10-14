import { supabase } from "@/lib/supabase";

import { stockRowsSchema, type StockProduct } from "../schemas/stock.schema";

export async function getStockProducts(
  signal: AbortSignal,
): Promise<StockProduct[]> {
  const permission = await supabase
    .rpc("can_read_inventory")
    .abortSignal(signal);

  if (permission.error) {
    throw permission.error;
  }

  if (permission.data !== true) {
    throw new Error("Tu cuenta no tiene permiso para consultar Stock.");
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      code,
      is_demo,
      product_images (
        storage_bucket,
        storage_path,
        alt_text
      ),
      product_variants (
        id,
        sku,
        size,
        color,
        sale_price,
        currency,
        inventory_balances (
          physical_quantity,
          reserved_quantity,
          available_quantity
        )
      )
    `,
    )
    .eq("is_active", true)
    .eq("product_images.is_cover", true)
    .eq("product_variants.is_active", true)
    .order("name")
    .abortSignal(signal);

  if (error) {
    throw error;
  }

  const products = stockRowsSchema.parse(data);

  const paths = [
    ...new Set(
      products.flatMap((product) =>
        product.product_images.map((image) => image.storage_path),
      ),
    ),
  ];

  const signedUrls = new Map<string, string>();

  if (paths.length > 0) {
    const result = await supabase.storage
      .from("inventory-images")
      .createSignedUrls(paths, 3_600);

    if (result.error) {
      throw result.error;
    }

    for (const image of result.data ?? []) {
      if (image.error || !image.path || !image.signedUrl) {
        throw new Error("No pudimos obtener una portada del inventario.");
      }

      signedUrls.set(image.path, image.signedUrl);
    }
  }

  return products.map((product) => {
    const cover = product.product_images[0];

    return {
      id: product.id,
      name: product.name,
      code: product.code,
      isDemo: product.is_demo,
      coverUrl: cover ? (signedUrls.get(cover.storage_path) ?? null) : null,
      coverAlt: cover?.alt_text ?? product.name,
      variants: product.product_variants,
    };
  });
}
