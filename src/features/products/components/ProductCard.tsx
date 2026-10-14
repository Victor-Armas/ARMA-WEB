import { Link } from 'react-router';
import { ProductImage } from './ProductImage';
import type { Product } from '../schemas/product.schema';
import { ProductStockSummary } from './ProductStockSummary';
import { getStockByColor } from '../utils/product-stock';

interface ProductCardProps {
  product: Product;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount);
}

export function ProductCard({ product }: ProductCardProps) {
  const stocks = getStockByColor(product.variants);
  const totalAvailable = stocks.reduce((sum, stock) => sum + stock.quantity, 0);
  const prices = new Map<string, { minimum: number; maximum: number }>();

  for (const variant of product.variants) {
    const previous = prices.get(variant.currency);
    prices.set(variant.currency, {
      minimum: Math.min(previous?.minimum ?? variant.sale_price, variant.sale_price),
      maximum: Math.max(previous?.maximum ?? variant.sale_price, variant.sale_price),
    });
  }

  return (
    <article className="overflow-hidden rounded-arma border border-arma-border bg-arma-surface">
      <Link to={`/products/${product.id}`} aria-label={`Ver detalle de ${product.name}`} className="block touch-manipulation focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-arma-active">
      <div className="aspect-[4/5] bg-arma-background">
        <ProductImage src={product.coverUrl} alt={product.coverAlt} className="h-full w-full object-contain" />
      </div>
      <div className="p-4">
        <h2 className="text-base font-semibold tracking-tight">{product.name}</h2>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          {[...prices.entries()].map(([currency, price]) => (
            <p key={currency} className="text-sm font-medium tabular-nums">
              {price.minimum !== price.maximum ? 'Desde ' : ''}
              {formatPrice(price.minimum, currency)}
            </p>
          ))}
          <p className="text-xs text-arma-muted">Total disponibles: <span className="font-semibold text-arma-text tabular-nums">{totalAvailable}</span></p>
        </div>
        <ProductStockSummary stocks={stocks} />
      </div>
      </Link>
    </article>
  );
}
