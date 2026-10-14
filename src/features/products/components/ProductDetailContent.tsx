import { useIsMutating } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { OrderForm } from '@/features/commerce/components/OrderForm';
import { useCommercePermissions } from '@/features/commerce/hooks/useCommerce';
import type { OrderKind } from '@/features/commerce/schemas/commerce.schema';
import { Bookmark, ShoppingBag } from 'lucide-react';
import type { ProductDetail } from '../types/product-detail.types';
import { useProductVariantSelection } from '../hooks/useProductVariantSelection';
import { getAvailableQuantity, getStockLevel, mainSizes } from '../utils/product-stock';
import { ProductGallery } from './ProductGallery';
import { ProductStockSummary } from './ProductStockSummary';
import { getStockByColor } from '../utils/product-stock';

interface ProductDetailContentProps { product: ProductDetail; }

const quantityClasses = {
  low: 'bg-arma-red-soft text-arma-red',
  warning: 'bg-arma-warning-soft text-arma-warning',
  healthy: 'bg-arma-green-soft text-arma-green',
};

export function ProductDetailContent({ product }: ProductDetailContentProps) {
  const [params] = useSearchParams();
  const [action, setAction] = useState<OrderKind | null>(() => params.get('action') === 'sale' ? 'sale' : params.get('action') === 'reservation' ? 'reservation' : null);
  const saving = useIsMutating({mutationKey: ['commerce-write']}) > 0;
  const permissions = useCommercePermissions();
  const { supported, colors, selectedVariant, selectColor, selectVariant } = useProductVariantSelection(product.variants);
  const available = selectedVariant ? getAvailableQuantity(selectedVariant) : 0;
  const physical = selectedVariant?.inventory_balances.reduce((total, balance) => total + balance.physical_quantity, 0) ?? 0;
  const reserved = selectedVariant?.inventory_balances.reduce((total, balance) => total + balance.reserved_quantity, 0) ?? 0;

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-10">
      <ProductGallery key={product.id} images={product.images} name={product.name} />
      <section aria-labelledby="product-title" className="min-w-0">
        <h1 id="product-title" className="font-arma-heading text-4xl tracking-[-0.035em] sm:text-5xl">{product.name}</h1>
        {product.description ? <p className="mt-4 max-w-prose text-sm leading-6 text-arma-muted">{product.description}</p> : null}
        {selectedVariant ? (
          <>
            <p className="mt-5 text-2xl font-semibold tabular-nums">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: selectedVariant.currency }).format(selectedVariant.sale_price)}</p>
            <p className="mt-1 break-all text-xs text-arma-muted">{selectedVariant.sku}</p>
            <fieldset disabled={saving} className="mt-7">
              <legend className="text-sm font-semibold">Color</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {colors.map(color => <button key={color} type="button" aria-pressed={color === selectedVariant.color} onClick={() => selectColor(color)} className={`min-h-11 rounded-arma border px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active ${color === selectedVariant.color ? 'border-arma-active bg-arma-primary-soft' : 'border-arma-border bg-arma-surface'}`}>{color}</button>)}
              </div>
            </fieldset>
            <fieldset disabled={saving} className="mt-6">
              <legend className="text-sm font-semibold">Talla</legend>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {mainSizes.map(({ size, label }) => {
                  const variant = supported.find(item => item.color === selectedVariant.color && item.size.trim().toUpperCase() === size);
                  const count = variant ? getAvailableQuantity(variant) : 0;
                  const isSelected = variant?.id === selectedVariant.id;
                  return <button key={size} type="button" disabled={!variant} aria-pressed={isSelected} onClick={() => { if (variant) selectVariant(variant.id); }} className={`min-h-16 rounded-arma border p-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active disabled:cursor-default disabled:opacity-60 ${isSelected ? 'border-arma-active ring-1 ring-arma-active' : 'border-transparent'} ${quantityClasses[getStockLevel(count)]}`}><span className="block text-xs font-medium">{label}</span><span className="mt-1 block text-sm tabular-nums">{count} disponibles</span></button>;
                })}
              </div>
            </fieldset>
            <dl className="mt-6 grid grid-cols-3 gap-3 border-y border-arma-border py-4">
              <div><dt className="text-xs text-arma-muted">Físicas</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{physical}</dd></div>
              <div><dt className="text-xs text-arma-muted">Apartadas</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{reserved}</dd></div>
              <div><dt className="text-xs text-arma-muted">Disponibles</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{available}</dd></div>
            </dl>
            {available === 0 ? <p className="mt-3 text-sm text-arma-red">Esta variante no tiene unidades disponibles.</p> : null}
          </>
        ) : (
          <div className="mt-6">
            <p className="text-sm leading-6 text-arma-muted">Este producto todavía no tiene variantes registradas en Chica, Mediana o Grande.</p>
            <ProductStockSummary stocks={getStockByColor(product.variants)} />
          </div>
        )}
        <div className="mt-7 grid grid-cols-2 gap-3">
          <button type="button" disabled={saving || !selectedVariant || available===0 || !permissions.data?.write} onClick={() => setAction('sale')} className="flex min-h-12 items-center justify-center gap-2 rounded-arma bg-arma-active px-3 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active disabled:opacity-50 disabled:cursor-default"><ShoppingBag size={19} aria-hidden="true" />Vender</button>
          <button type="button" disabled={saving || !selectedVariant || available===0 || !permissions.data?.write} onClick={() => setAction('reservation')} className="flex min-h-12 items-center justify-center gap-2 rounded-arma border border-arma-border bg-arma-surface px-3 text-sm font-semibold text-arma-icon hover:bg-arma-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active disabled:opacity-50 disabled:cursor-default"><Bookmark size={19} aria-hidden="true" />Apartar</button>
        </div>
        {permissions.isError ? <div role="alert" className="mt-3 text-xs text-arma-red">No pudimos verificar tus permisos. <button type="button" onClick={()=>void permissions.refetch()} className="min-h-11 underline underline-offset-4">Reintentar</button></div> : permissions.data && !permissions.data.write ? <p className="mt-3 text-xs text-arma-muted">Tu cuenta tiene acceso de consulta; requiere permiso para vender y apartar.</p> : null}
        {action && selectedVariant && permissions.data?.write ? <OrderForm key={`${selectedVariant.id}-${action}`} kind={action} variant={selectedVariant} productName={product.name} onClose={() => setAction(null)} /> : null}
      </section>
    </div>
  );
}
