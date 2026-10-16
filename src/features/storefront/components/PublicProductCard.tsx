import { PublicProductPrice } from "./PublicProductPrice";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { ProductImage } from "@/features/products/components/ProductImage";
import type { StorefrontProduct } from "../schemas/storefront.schema";
import { publicSizes } from "../utils/storefront-format";

export function PublicProductCard({
  product,
  eager = false,
}: {
  product: StorefrontProduct;
  eager?: boolean;
}) {
  const photo = product.photos[0];
  return (
    <article className="min-w-0">
      <Link
        to={`/coleccion/producto/${product.id}`}
        className="block rounded-arma"
        aria-label={`Ver ${product.name}`}
      >
        <div className="relative overflow-hidden rounded-arma bg-white">
          <ProductImage
            src={photo?.url ?? null}
            alt={photo?.alt ?? product.name}
            background={photo?.background}
            width={640}
            height={800}
            loading={eager ? "eager" : "lazy"}
            className="aspect-[4/5] w-full object-cover"
          />
          <span
            className="absolute right-3 bottom-3 inline-flex size-11 items-center justify-center rounded-arma bg-arma-background text-arma-text"
            aria-hidden="true"
          >
            <ArrowUpRight size={22} strokeWidth={1.5} />
          </span>
        </div>
        <div className="flex items-start justify-between gap-3 pt-4">
          <h3 className="min-w-0 break-words text-lg font-semibold">
            {product.name}
          </h3>
        </div>
        <p className="mt-1 text-sm font-medium text-arma-active">
          <PublicProductPrice variants={product.variants} />
        </p>
        <p className="mt-2 text-xs leading-5 text-arma-neutral">
          {publicSizes(product.variants).join(" / ")} ·{" "}
          {[...new Set(product.variants.map((v) => v.color))].join(" · ")}
        </p>
      </Link>
    </article>
  );
}
