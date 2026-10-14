import { Link } from 'react-router';
import { ProductImage } from '@/features/products/components/ProductImage';
import type { CommerceOrder } from '../schemas/commerce.schema';
import { formatMoney } from '../utils/commerce-format';

export function OrderLineItems({items, detailed = false}: {items: CommerceOrder['items']; detailed?: boolean}) {
  return <ul className="divide-y divide-arma-border">
    {items.map(item => <li key={item.id} className="grid grid-cols-[80px_minmax(0,1fr)] gap-4 py-4 sm:grid-cols-[104px_minmax(0,1fr)_auto] sm:gap-5">
      <Link to={`/products/${item.product_id}`} aria-label={`Ver ${item.product_name}`} className="self-start overflow-hidden rounded-arma bg-arma-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active">
        <ProductImage src={item.cover_url} alt={item.product_name} width={104} height={130} className="aspect-[4/5] h-auto w-full object-cover" />
      </Link>
      <div className="min-w-0 self-center">
        <Link to={`/products/${item.product_id}`} className="font-semibold text-arma-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-arma-active">{item.product_name}</Link>
        <p className="mt-1 text-sm text-arma-muted">{item.color} · {item.size} · {item.quantity} {item.quantity===1?'pieza':'piezas'}</p>
        {detailed ? <><p className="mt-2 break-all text-xs text-arma-muted">{item.sku}</p><p className="mt-2 text-sm tabular-nums">{formatMoney(item.unit_price)} por pieza</p></> : null}
        {item.catalog_price!==item.unit_price ? <p className="mt-2 text-xs text-arma-muted">Catálogo: {formatMoney(item.catalog_price)} · Acordado: {formatMoney(item.unit_price)}</p> : null}
        <p className="mt-3 font-semibold tabular-nums sm:hidden">{formatMoney(item.quantity*item.unit_price)}</p>
      </div>
      <p className="hidden self-center text-lg font-semibold tabular-nums sm:block">{formatMoney(item.quantity*item.unit_price)}</p>
    </li>)}
  </ul>;
}
