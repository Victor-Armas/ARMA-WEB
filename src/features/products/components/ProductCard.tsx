import { Link, useLocation } from "react-router";
import { ProductImage } from "./ProductImage";
import type { Product, ProductScope } from "../schemas/product.schema";
import { ProductStockSummary } from "./ProductStockSummary";
import { getStockByColor } from "../utils/product-stock";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
  catalogOnly?: boolean;
  scope?: ProductScope;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(
    amount,
  );
}

export function ProductCard({
  product,
  priority = false,
  catalogOnly = false,
  scope = "warehouse",
}: ProductCardProps) {
  const { search } = useLocation();
  const stocks = getStockByColor(product.variants);
  const totalAvailable = stocks.reduce((sum, stock) => sum + stock.quantity, 0);
  const prices = new Map<string, { minimum: number; maximum: number }>();

  const pricedVariants =
    scope === "mine"
      ? product.variants.filter((variant) =>
          variant.inventory_balances.some(
            (balance) => balance.physical_quantity > 0,
          ),
        )
      : product.variants;
  for (const variant of pricedVariants) {
    const amount =
      scope !== "warehouse"
        ? (variant.seller_price ?? variant.sale_price)
        : variant.sale_price;
    const previous = prices.get(variant.currency);
    prices.set(variant.currency, {
      minimum: Math.min(previous?.minimum ?? amount, amount),
      maximum: Math.max(previous?.maximum ?? amount, amount),
    });
  }

  return (
    <article className="overflow-hidden rounded-arma border border-arma-border bg-arma-surface">
      <Link
        to={`/products/${product.id}${search}`}
        aria-label={`Ver detalle de ${product.name}`}
        className="block touch-manipulation focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-arma-active"
      >
        <div className="aspect-[4/5] bg-arma-background">
          <ProductImage
            src={product.coverUrl}
            alt={product.coverAlt}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            width={600}
            height={750}
            className="h-full w-full object-contain"
          />
        </div>
        <div className="p-4">
          <h2 className="text-base font-semibold tracking-tight">
            {product.name}
          </h2>
          <p className="mt-2 text-xs text-arma-muted">
            {scope === "warehouse" ? "Precio de catálogo" : "Precio"}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            {[...prices.entries()].map(([currency, price]) => (
              <div key={currency}>
                <p className="text-sm font-medium tabular-nums">
                  {price.minimum !== price.maximum ? "Desde " : ""}
                  {formatPrice(price.minimum, currency)}
                </p>
              </div>
            ))}
            {!catalogOnly ? (
              <p className="text-xs text-arma-muted">
                Total disponibles:{" "}
                <span className="font-semibold text-arma-text tabular-nums">
                  {totalAvailable}
                </span>
              </p>
            ) : null}
          </div>
          {catalogOnly ? (
            <p className="mt-3 text-xs text-arma-info">Ver diseño y tallas</p>
          ) : (
            <ProductStockSummary stocks={stocks} />
          )}
        </div>
      </Link>
    </article>
  );
}
