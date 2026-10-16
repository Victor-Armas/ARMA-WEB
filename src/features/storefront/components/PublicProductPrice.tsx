import type { PublicVariant } from "../schemas/storefront.schema";
import { publicPrice } from "../utils/storefront-format";
export function PublicProductPrice({
  variants,
}: {
  variants: PublicVariant[];
}) {
  const discounted = variants.some(
    (v) => v.regular_price !== undefined && v.regular_price > v.sale_price,
  );
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      {discounted && (
        <>
          <span className="sr-only">Precio regular</span>
          <del className="font-normal opacity-90">
            {publicPrice(
              variants.map((v) => ({
                ...v,
                sale_price: v.regular_price ?? v.sale_price,
              })),
            )}
          </del>
          <span className="sr-only">Precio de oferta</span>
        </>
      )}
      {publicPrice(variants)}
    </span>
  );
}
