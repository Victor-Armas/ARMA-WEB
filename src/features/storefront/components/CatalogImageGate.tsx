import type { ReactNode } from "react";
import type { StorefrontProduct } from "../schemas/storefront.schema";
import { useCatalogImagesReady } from "../hooks/useCatalogImagesReady";
import { CollectionLoader } from "./CollectionLoader";

export function CatalogImageGate({
  products,
  children,
}: {
  products: StorefrontProduct[];
  children: (products: StorefrontProduct[]) => ReactNode;
}) {
  const images = useCatalogImagesReady(products);
  if (!images.ready)
    return <CollectionLoader done={images.done} total={images.total} />;
  return (
    <>
      {images.failedCount ? (
        <div
          role="status"
          className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-5 py-4 text-sm text-arma-neutral"
        >
          <p>Algunas fotografías no pudieron cargar.</p>
          <button
            type="button"
            onClick={images.retry}
            className="min-h-11 font-semibold underline underline-offset-4"
          >
            Reintentar imágenes
          </button>
        </div>
      ) : null}
      {children(images.products)}
    </>
  );
}
