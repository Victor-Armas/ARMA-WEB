import { supabase } from "@/lib/supabase";
import {
  productsPageSchema,
  productDetailRowSchema,
  type ProductsPageData,
  type ProductScope,
} from "../schemas/product.schema";
import type { ProductDetail } from "../types/product-detail.types";
import {
  getSignedProductImages,
  getImageRefreshAt,
} from "./product-image-cache.service";

export async function getProducts(
  page: number,
  scope: ProductScope,
  search: string,
  userId: string,
  signal: AbortSignal,
): Promise<ProductsPageData> {
  const { data, error } = await supabase
    .rpc("scoped_products_page", {
      p_scope: scope,
      p_page: page,
      p_search: search,
    })
    .abortSignal(signal);
  if (error) throw error;
  const response = productsPageSchema.parse(data);
  const paths = response.items.flatMap((product) =>
    product.product_images.map(
      (image) => image.thumbnail_path ?? image.storage_path,
    ),
  );
  const urls = await getSignedProductImages(paths, userId);
  return {
    total: response.total,
    page: response.page,
    imageRefreshAt: getImageRefreshAt(urls),
    items: response.items.map((product) => {
      const cover = product.product_images[0];
      const path = cover ? (cover.thumbnail_path ?? cover.storage_path) : null;
      return {
        id: product.id,
        name: product.name,
        code: product.code,
        isDemo: product.is_demo,
        coverUrl: path ? (urls.get(path)?.url ?? null) : null,
        coverAlt: cover?.alt_text ?? product.name,
        variants: product.product_variants,
      };
    }),
  };
}

export async function getProductDetail(
  productId: string,
  scope: ProductScope,
  userId: string,
  signal: AbortSignal,
): Promise<ProductDetail | null> {
  const { data, error } = await supabase
    .rpc("scoped_product_detail", { p_id: productId, p_scope: scope })
    .abortSignal(signal);
  if (error) throw error;
  if (data === null) return null;
  const product = productDetailRowSchema.parse(data);
  const sortedImages = [...product.product_images].sort(
    (first, second) =>
      Number(second.is_cover) - Number(first.is_cover) ||
      first.sort_order - second.sort_order,
  );
  const urls = await getSignedProductImages(
    sortedImages.map((image) => image.storage_path),
    userId,
  );
  return {
    id: product.id,
    name: product.name,
    code: product.code,
    description: product.description,
    isDemo: product.is_demo,
    imageRefreshAt: getImageRefreshAt(urls),
    variants: product.product_variants,
    images: sortedImages.map((image) => ({
      id: image.id,
      url: urls.get(image.storage_path)?.url ?? null,
      alt: image.alt_text,
      caption: image.caption,
      background: image.background_color,
    })),
  };
}
