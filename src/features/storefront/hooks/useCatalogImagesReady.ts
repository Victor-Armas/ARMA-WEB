import { useEffect, useMemo, useState } from "react";
import type { StorefrontProduct } from "../schemas/storefront.schema";
import { isPhotoReady, preloadPhoto } from "../services/image-preload.service";

export function useCatalogImagesReady(products: StorefrontProduct[]) {
  const urls = useMemo(
    () => [
      ...new Set(
        products.flatMap((p) =>
          p.photos.flatMap((photo) => (photo.url ? [photo.url] : [])),
        ),
      ),
    ],
    [products],
  );
  const key = JSON.stringify(urls);
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState({
    key: "",
    attempt: 0,
    done: 0,
    complete: false,
    failed: new Set<string>(),
  });
  const cached = urls.every(isPhotoReady);
  useEffect(() => {
    if (cached) return;
    let active = true;
    let done = 0;
    const failed = new Set<string>();
    void Promise.all(
      urls.map(async (url) => {
        const success = await preloadPhoto(url);
        if (!success) failed.add(url);
        done++;
        if (active)
          setProgress({
            key,
            attempt,
            done,
            complete: done === urls.length,
            failed: new Set(failed),
          });
      }),
    );
    return () => {
      active = false;
    };
  }, [urls, key, cached, attempt]);
  const current = progress.key === key && progress.attempt === attempt;
  const ready = cached || (current && progress.complete);
  const failed = current ? progress.failed : new Set<string>();
  return {
    ready,
    done: cached ? urls.length : current ? progress.done : 0,
    total: urls.length,
    failedCount: failed.size,
    products: failed.size
      ? products.map((p) => ({
          ...p,
          photos: p.photos.map((photo) =>
            photo.url && failed.has(photo.url)
              ? { ...photo, url: null }
              : photo,
          ),
        }))
      : products,
    retry: () => setAttempt((value) => value + 1),
  };
}
