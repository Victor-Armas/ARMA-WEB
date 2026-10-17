import { PersonalPriceModal } from "@/features/sellers/components/PersonalPriceModal";
import type { ProductScope } from "../schemas/product.schema";
import { useAppAccess } from "@/features/access/hooks/useAppAccess";
import { useIsMutating } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { OrderModal } from "@/features/commerce/components/OrderModal";
import { useCommercePermissions } from "@/features/commerce/hooks/useCommerce";
import type { OrderKind } from "@/features/commerce/schemas/commerce.schema";
import { Bookmark, ShoppingBag, Settings2 } from "lucide-react";
import type { ProductDetail } from "../types/product-detail.types";
import { useProductVariantSelection } from "../hooks/useProductVariantSelection";
import {
  getAvailableQuantity,
  getStockLevel,
  mainSizes,
} from "../utils/product-stock";
import { ProductGallery } from "./ProductGallery";
import { ProductStockSummary } from "./ProductStockSummary";
import { getStockByColor } from "../utils/product-stock";

interface ProductDetailContentProps {
  product: ProductDetail;
  scope: ProductScope;
}

const quantityClasses = {
  low: "bg-arma-red-soft text-arma-red",
  warning: "bg-arma-warning-soft text-arma-warning",
  healthy: "bg-arma-green-soft text-arma-green",
};

export function ProductDetailContent({
  product,
  scope,
}: ProductDetailContentProps) {
  const [params] = useSearchParams();
  const [editingPrice, setEditingPrice] = useState(false);
  const [action, setAction] = useState<OrderKind | null>(() =>
    params.get("action") === "sale"
      ? "sale"
      : params.get("action") === "reservation"
        ? "reservation"
        : null,
  );
  const saving = useIsMutating({ mutationKey: ["commerce-write"] }) > 0;
  const permissions = useCommercePermissions();
  const access = useAppAccess();
  const canSale = scope !== "catalog" && access.can("sales.create");
  const canReserve = access.can("reservations.create");
  const { supported, colors, selectedVariant, selectColor, selectVariant } =
    useProductVariantSelection(product.variants);
  const available = selectedVariant ? getAvailableQuantity(selectedVariant) : 0;
  const physical =
    selectedVariant?.inventory_balances.reduce(
      (total, balance) => total + balance.physical_quantity,
      0,
    ) ?? 0;
  const reserved =
    selectedVariant?.inventory_balances.reduce(
      (total, balance) => total + balance.reserved_quantity,
      0,
    ) ?? 0;

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-10">
      <ProductGallery
        key={product.id}
        images={product.images}
        name={product.name}
      />
      <section aria-labelledby="product-title" className="min-w-0">
        <h1
          id="product-title"
          className="font-arma-heading text-4xl tracking-[-0.035em] sm:text-5xl"
        >
          {product.name}
        </h1>
        {product.description ? (
          <p className="mt-4 max-w-prose text-sm leading-6 text-arma-muted">
            {product.description}
          </p>
        ) : null}
        {selectedVariant ? (
          <>
            <p className="mt-5 text-xs font-medium text-arma-muted">
              {scope === "warehouse" ? "Precio de catálogo" : "Precio"}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {new Intl.NumberFormat("es-MX", {
                style: "currency",
                currency: selectedVariant.currency,
              }).format(
                scope !== "warehouse"
                  ? (selectedVariant.seller_price ?? selectedVariant.sale_price)
                  : selectedVariant.sale_price,
              )}
            </p>
            <div className="mt-1 flex min-w-0 items-center justify-between gap-3">
              <p className="min-w-0 break-all text-xs text-arma-muted">
                {selectedVariant.sku}
              </p>
              {scope === "mine" &&
              access.can("products.price_own") &&
              (physical > 0 || selectedVariant.seller_price !== null) ? (
                <button
                  type="button"
                  aria-label="Configurar mi precio"
                  disabled={saving}
                  onClick={() => setEditingPrice(true)}
                  className="flex size-11 shrink-0 items-center justify-center rounded-arma text-arma-muted hover:bg-arma-primary-soft hover:text-arma-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active disabled:opacity-50"
                >
                  <Settings2 size={17} strokeWidth={1.6} aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <fieldset disabled={saving} className="mt-7">
              <legend className="text-sm font-semibold">Color</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-pressed={color === selectedVariant.color}
                    onClick={() => selectColor(color)}
                    className={`min-h-11 rounded-arma border px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active ${color === selectedVariant.color ? "border-arma-active bg-arma-primary-soft" : "border-arma-border bg-arma-surface"}`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset disabled={saving} className="mt-6">
              <legend className="text-sm font-semibold">Talla</legend>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {mainSizes.map(({ size, label }) => {
                  const variant = supported.find(
                    (item) =>
                      item.color === selectedVariant.color &&
                      item.size.trim().toUpperCase() === size,
                  );
                  const count = variant ? getAvailableQuantity(variant) : 0;
                  const isSelected = variant?.id === selectedVariant.id;
                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={!variant}
                      aria-pressed={isSelected}
                      onClick={() => {
                        if (variant) selectVariant(variant.id);
                      }}
                      className={`min-h-16 rounded-arma border p-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active disabled:cursor-default disabled:opacity-60 ${isSelected ? "border-arma-active ring-1 ring-arma-active" : "border-transparent"} ${scope === "catalog" ? "bg-arma-surface text-arma-text" : quantityClasses[getStockLevel(count)]}`}
                    >
                      <span className="block text-xs font-medium">{label}</span>
                      <span className="mt-1 block text-sm tabular-nums">
                        {scope === "catalog"
                          ? "Consultar"
                          : `${count} disponibles`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            {scope !== "catalog" ? (
              <dl className="mt-6 grid grid-cols-3 gap-3 border-y border-arma-border py-4">
                <div>
                  <dt className="text-xs text-arma-muted">Físicas</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums">
                    {physical}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-arma-muted">Apartadas</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums">
                    {reserved}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-arma-muted">Disponibles</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums">
                    {available}
                  </dd>
                </div>
              </dl>
            ) : null}
            {scope !== "catalog" && available === 0 ? (
              <p className="mt-3 text-sm text-arma-red">
                Esta variante no tiene unidades disponibles.
              </p>
            ) : null}
          </>
        ) : (
          <div className="mt-6">
            <p className="text-sm leading-6 text-arma-muted">
              Este producto todavía no tiene variantes registradas en Chica,
              Mediana o Grande.
            </p>
            <ProductStockSummary stocks={getStockByColor(product.variants)} />
          </div>
        )}
        {scope === "catalog" ? (
          <p className="mt-6 rounded-arma bg-arma-info-soft p-4 text-sm leading-6 text-arma-info">
            Consulta los diseños, colores y tallas de cada producto.
            {canReserve && selectedVariant ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => setAction("reservation")}
                className="mt-3 block min-h-11 rounded-arma bg-arma-active px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Solicitar sin existencia
              </button>
            ) : null}
          </p>
        ) : (
          <div className="mt-7 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={
                saving || !selectedVariant || available === 0 || !canSale
              }
              onClick={() => setAction("sale")}
              className="flex min-h-12 items-center justify-center gap-2 rounded-arma bg-arma-active px-3 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active disabled:opacity-50 disabled:cursor-default"
            >
              <ShoppingBag size={19} aria-hidden="true" />
              Vender
            </button>
            <button
              type="button"
              disabled={saving || !selectedVariant || !canReserve}
              onClick={() => setAction("reservation")}
              className="flex min-h-12 items-center justify-center gap-2 rounded-arma border border-arma-border bg-arma-surface px-3 text-sm font-semibold text-arma-icon hover:bg-arma-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active disabled:opacity-50 disabled:cursor-default"
            >
              <Bookmark size={19} aria-hidden="true" />
              {available === 0 ? "Solicitar sin existencia" : "Apartar"}
            </button>
          </div>
        )}
        {permissions.isError ? (
          <div role="alert" className="mt-3 text-xs text-arma-red">
            No pudimos verificar tus permisos.{" "}
            <button
              type="button"
              onClick={() => void permissions.refetch()}
              className="min-h-11 underline underline-offset-4"
            >
              Reintentar
            </button>
          </div>
        ) : permissions.data && !permissions.data.write ? (
          <p className="mt-3 text-xs text-arma-muted">
            Tu cuenta tiene acceso de consulta; requiere permiso para vender y
            apartar.
          </p>
        ) : null}
        {editingPrice && selectedVariant ? (
          <PersonalPriceModal
            key={selectedVariant.id}
            variant={selectedVariant}
            productName={product.name}
            onClose={() => setEditingPrice(false)}
          />
        ) : null}
        {action &&
        selectedVariant &&
        (action === "sale" ? canSale : canReserve) ? (
          <OrderModal
            key={`${selectedVariant.id}-${action}`}
            kind={action}
            variant={selectedVariant}
            productName={product.name}
            photoUrl={product.images[0]?.url ?? null}
            scope={scope}
            onClose={() => setAction(null)}
          />
        ) : null}
      </section>
    </div>
  );
}
