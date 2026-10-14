import { z } from 'zod';
import { supabase } from '@/lib/supabase';

export interface SignedProductImage {
  url: string;
  expiresAt: number;
}

const storageKey = 'arma-product-image-links-v1';
const lifetime = 60 * 60_000;
const renewalBuffer = 5 * 60_000;
const maximumEntries = 256;
const signedUrlPrefix = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/sign/inventory-images/`;
const savedCacheSchema = z.object({
  userId: z.uuid(),
  entries: z.array(z.object({
    path: z.string(),
    url: z.url(),
    expiresAt: z.number().finite(),
  })).max(maximumEntries),
});

let owner: string | null = null;
const cache = new Map<string, SignedProductImage>();
const requests = new Map<string, Promise<Map<string, SignedProductImage>>>();

function persistCache() {
  if (typeof window === 'undefined' || !owner) return;
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify({
      userId: owner,
      entries: [...cache.entries()].map(([path, image]) => ({ path, ...image })),
    }));
  } catch { /* La caché en memoria sigue funcionando si Storage no está disponible. */ }
}

function hydrateCache(userId: string) {
  if (owner === userId) return;
  owner = userId;
  cache.clear();
  requests.clear();
  if (typeof window === 'undefined') return;
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return;
    const result = savedCacheSchema.safeParse(JSON.parse(raw));
    if (!result.success || result.data.userId !== userId) return;
    const now = Date.now();
    for (const { path, url, expiresAt } of result.data.entries) {
      if (expiresAt > now + renewalBuffer && expiresAt <= now + lifetime && url.startsWith(signedUrlPrefix)) {
        cache.set(path, { url, expiresAt });
      }
    }
  } catch { /* Se ignorarán datos locales inválidos o inaccesibles. */ }
}

export function clearProductImageCache() {
  owner = null;
  cache.clear();
  requests.clear();
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.removeItem(storageKey); } catch { /* Sin almacenamiento disponible. */ }
}

export function getImageRefreshAt(images: Map<string, SignedProductImage>): number | null {
  if (images.size === 0) return null;
  return Math.min(...[...images.values()].map(image => image.expiresAt)) - renewalBuffer;
}

export async function getSignedProductImages(paths: string[], userId: string): Promise<Map<string, SignedProductImage>> {
  hydrateCache(userId);
  const now = Date.now();
  for (const [path, image] of cache) if (image.expiresAt <= now + renewalBuffer) cache.delete(path);
  const unique = [...new Set(paths)];
  const result = new Map<string, SignedProductImage>();
  const missing: string[] = [];
  for (const path of unique) {
    const image = cache.get(path);
    if (image) result.set(path, image);
    else missing.push(path);
  }
  if (missing.length === 0) return result;

  const requestKey = JSON.stringify([userId, [...missing].sort()]);
  let request = requests.get(requestKey);
  if (!request) {
    request = (async () => {
      const issuedAt = Date.now();
      const response = await supabase.storage.from('inventory-images').createSignedUrls(missing, 3_600);
      if (response.error) throw response.error;
      const signed = new Map<string, SignedProductImage>();
      for (const image of response.data ?? []) {
        if (image.error || !image.path || !image.signedUrl) throw new Error('No pudimos obtener una imagen del producto.');
        signed.set(image.path, { url: image.signedUrl, expiresAt: issuedAt + lifetime });
      }
      if (signed.size !== missing.length) throw new Error('No pudimos obtener todas las imágenes del producto.');
      if (owner === userId) {
        for (const [path, image] of signed) cache.set(path, image);
        while (cache.size > maximumEntries) {
          const first = cache.keys().next();
          if (first.done) break;
          cache.delete(first.value);
        }
        persistCache();
      }
      return signed;
    })();
    requests.set(requestKey, request);
  }
  try {
    for (const [path, image] of await request) result.set(path, image);
  } finally {
    if (requests.get(requestKey) === request) requests.delete(requestKey);
  }
  return result;
}
