import { supabase } from '@/lib/supabase';
import { productRowsSchema, productDetailRowSchema, type Product } from '../schemas/product.schema';
import type { ProductDetail } from '../types/product-detail.types';

async function assertCanReadProducts(signal: AbortSignal) {
  const permission = await supabase.rpc('can_read_inventory').abortSignal(signal);
  if (permission.error) throw permission.error;
  if (permission.data !== true) throw new Error('Tu cuenta no tiene permiso para consultar Productos.');
}

async function signImages(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const result = await supabase.storage.from('inventory-images').createSignedUrls([...new Set(paths)], 3_600);
  if (result.error) throw result.error;
  for (const image of result.data ?? []) {
    if (image.error || !image.path || !image.signedUrl) {
      throw new Error('No pudimos obtener una imagen del producto.');
    }
    urls.set(image.path, image.signedUrl);
  }
  return urls;
}

const variantSelection = `
  product_variants (
    id, sku, size, color, sale_price, currency,
    inventory_balances (physical_quantity, reserved_quantity, available_quantity)
  )
`;

export async function getProducts(signal: AbortSignal): Promise<Product[]> {
  await assertCanReadProducts(signal);
  const { data, error } = await supabase.from('products')
    .select(`id, name, code, is_demo, product_images (storage_bucket, storage_path, alt_text), ${variantSelection}`)
    .eq('is_active', true)
    .eq('product_images.is_cover', true)
    .eq('product_variants.is_active', true)
    .order('name')
    .abortSignal(signal);
  if (error) throw error;
  const products = productRowsSchema.parse(data);
  const urls = await signImages(products.flatMap(product => product.product_images.map(image => image.storage_path)));
  return products.map(product => {
    const cover = product.product_images[0];
    return {
      id: product.id, name: product.name, code: product.code,
      isDemo: product.is_demo,
      coverUrl: cover ? urls.get(cover.storage_path) ?? null : null,
      coverAlt: cover?.alt_text ?? product.name,
      variants: product.product_variants,
    };
  });
}

export async function getProductDetail(productId: string, signal: AbortSignal): Promise<ProductDetail | null> {
  await assertCanReadProducts(signal);
  const { data, error } = await supabase.from('products')
    .select(`id, name, code, description, is_demo, product_images (id, storage_bucket, storage_path, alt_text, caption, sort_order, is_cover), ${variantSelection}`)
    .eq('id', productId)
    .eq('is_active', true)
    .eq('product_variants.is_active', true)
    .abortSignal(signal)
    .maybeSingle();
  if (error) throw error;
  if (data === null) return null;
  const product = productDetailRowSchema.parse(data);
  const sortedImages = [...product.product_images].sort((first, second) =>
    Number(second.is_cover) - Number(first.is_cover) || first.sort_order - second.sort_order,
  );
  const urls = await signImages(sortedImages.map(image => image.storage_path));
  return {
    id: product.id, name: product.name, code: product.code,
    description: product.description, isDemo: product.is_demo,
    variants: product.product_variants,
    images: sortedImages.map(image => ({
      id: image.id, url: urls.get(image.storage_path) ?? null,
      alt: image.alt_text, caption: image.caption,
    })),
  };
}
