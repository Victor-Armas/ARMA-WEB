import { publicSupabase } from "@/lib/supabase-public";
import {
  storefrontPageSchema,
  type CatalogFilters,
  type StorefrontPage,
} from "../schemas/storefront.schema";

const imageLinks = new Map<string, { url: string; expiresAt: number }>();
async function signImages(paths: string[]) {
  const now = Date.now();
  for (const [path, image] of imageLinks)
    if (image.expiresAt <= now) imageLinks.delete(path);
  const missing = [...new Set(paths)].filter((path) => !imageLinks.has(path));
  if (missing.length) {
    const { data } = await publicSupabase.storage
      .from("inventory-images")
      .createSignedUrls(missing, 3600);
    for (const image of data ?? []) {
      if (image.path && image.signedUrl && !image.error) {
        imageLinks.set(image.path, {
          url: image.signedUrl,
          expiresAt: now + 50 * 60_000,
        });
      }
    }
    while (imageLinks.size > 192) {
      const first = imageLinks.keys().next();
      if (first.done) break;
      imageLinks.delete(first.value);
    }
  }
  return new Map(
    paths.map((path) => [path, imageLinks.get(path)?.url ?? null]),
  );
}

export async function getStorefrontPage(
  filters: CatalogFilters,
  signal: AbortSignal,
  id?: string,
): Promise<StorefrontPage> {
  const { data, error } = await publicSupabase
    .rpc("customer_catalog_page", {
      p_page: filters.page,
      p_search: filters.search,
      p_size: filters.size,
      p_color: filters.color,
      p_id: id ?? null,
    })
    .abortSignal(AbortSignal.any([signal, AbortSignal.timeout(15000)]));
  if (error) throw error;
  const page = storefrontPageSchema.parse(data);
  return hydrateStorefrontPage(page, id);
}

export async function hydrateStorefrontPage(
  page: import("zod").infer<typeof storefrontPageSchema>,
  id?: string,
): Promise<StorefrontPage> {
  const pathFor = (image: StorefrontPage["items"][number]["images"][number]) =>
    id ? image.storage_path : (image.thumbnail_path ?? image.storage_path);
  const urls = await signImages(
    page.items.flatMap((product) => product.images.map(pathFor)),
  );
  return {
    ...page,
    items: page.items.map((product) => ({
      ...product,
      photos: product.images.map((image) => ({
        id: image.id,
        url: urls.get(pathFor(image)) ?? null,
        alt: image.alt_text || product.name,
        caption: image.caption,
        background: image.background_color,
      })),
    })),
  };
}
