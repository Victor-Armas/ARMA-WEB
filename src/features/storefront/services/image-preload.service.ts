const decodedImages = new Set<string>();
const pendingImages = new Map<string, Promise<boolean>>();
export function isPhotoReady(url: string) {
  return decodedImages.has(url);
}
export function preloadPhoto(url: string): Promise<boolean> {
  if (decodedImages.has(url)) return Promise.resolve(true);
  const pending = pendingImages.get(url);
  if (pending) return pending;
  const promise = new Promise<boolean>((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = (success: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      if (success) {
        decodedImages.add(url);
        while (decodedImages.size > 256) {
          const first = decodedImages.values().next();
          if (first.done) break;
          decodedImages.delete(first.value);
        }
      }
      resolve(success);
    };
    const timer = setTimeout(() => finish(false), 10000);
    image.onload = () => {
      void image.decode().then(
        () => finish(true),
        () => finish(false),
      );
    };
    image.onerror = () => finish(false);
    image.decoding = "async";
    image.src = url;
  });
  pendingImages.set(url, promise);
  void promise.finally(() => pendingImages.delete(url));
  return promise;
}
