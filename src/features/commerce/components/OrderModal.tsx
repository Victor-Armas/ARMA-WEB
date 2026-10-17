import { useState } from "react";
import { useAppAccess } from "@/features/access/hooks/useAppAccess";
import { getAvailableQuantity } from "@/features/products/utils/product-stock";
import { Modal } from "@/components/ui/Modal";
import { ProductImage } from "@/features/products/components/ProductImage";
import type {
  ProductVariant,
  ProductScope,
} from "@/features/products/schemas/product.schema";
import type { OrderKind } from "../schemas/commerce.schema";
import {
  fieldClass,
  formatMoney,
  formatDateTime,
} from "../utils/commerce-format";
import { OrderForm } from "./OrderForm";
export function OrderModal({
  kind,
  variant,
  productName,
  photoUrl,
  scope,
  onClose,
}: {
  kind: OrderKind;
  variant: ProductVariant;
  productName: string;
  photoUrl: string | null;
  scope: ProductScope;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const access = useAppAccess();
  const source =
    scope === "mine" ||
    (scope === "catalog" && !access.can("inventory.sell_workshop"))
      ? "seller"
      : "warehouse";
  const canReserveExisting =
    scope !== "catalog" &&
    (scope === "mine"
      ? variant.consignment_lots.some((l) => l.available > 0)
      : getAvailableQuantity(variant) > 0);
  const [stockMode, setStockMode] = useState<"reserved" | "waiting">(() =>
    kind === "reservation" && !canReserveExisting ? "waiting" : "reserved",
  );
  const [lotId, setLotId] = useState(variant.consignment_lots[0]?.id ?? "");
  const delivery = variant.consignment_lots.find((lot) => lot.id === lotId);
  return (
    <Modal
      title={kind === "sale" ? "Nueva venta" : "Nuevo apartado"}
      wide
      busy={busy}
      onClose={onClose}
    >
      <div className="mb-5 flex items-center gap-4 border-b border-arma-border pb-5">
        <div className="h-24 w-20 shrink-0">
          <ProductImage
            src={photoUrl}
            alt={productName}
            className="h-full w-full rounded-arma object-contain"
          />
        </div>
        <div>
          <p className="font-semibold">{productName}</p>
          <p className="mt-1 text-sm text-arma-muted">
            {variant.color} · {variant.size}
          </p>
          <p className="mt-2 text-xs text-arma-muted">
            {source === "seller"
              ? "Cobro recibido por el vendedor"
              : "Operación del taller"}
          </p>
        </div>
      </div>
      {kind === "reservation" && (
        <fieldset disabled={busy} className="mb-5">
          <legend className="mb-3 text-sm font-semibold">
            Existencia del apartado
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["reserved", "Reservar existencia disponible"],
                ["waiting", "Pendiente de existencia"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={`flex min-h-12 items-center gap-3 rounded-arma border p-3 text-sm ${stockMode === value ? "border-arma-active bg-arma-primary-soft" : "border-arma-border"}`}
              >
                <input
                  type="radio"
                  name="reservation-stock-mode"
                  value={value}
                  checked={stockMode === value}
                  disabled={value === "reserved" && !canReserveExisting}
                  onChange={() => setStockMode(value)}
                  className="size-4 accent-arma-active"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {kind === "reservation" && stockMode === "waiting" && (
        <p
          role="status"
          className="mb-5 rounded-arma bg-arma-info-soft p-4 text-sm leading-6 text-arma-info"
        >
          Se guardará el pedido y su anticipo, sin descontar ni reservar piezas
          todavía. Cuando{" "}
          {source === "seller"
            ? "ARMA te entregue la mercancía"
            : "estén listas las playeras"}
          , asigna la existencia desde el detalle del apartado antes de
          completar la venta.
        </p>
      )}
      {scope === "mine" && stockMode !== "waiting" ? (
        <div className="mb-5">
          <label
            htmlFor="delivery-lot"
            className="mb-2 block text-sm font-medium"
          >
            Entrega de la que vas a vender
          </label>
          <select
            id="delivery-lot"
            value={lotId}
            disabled={busy}
            onChange={(e) => setLotId(e.target.value)}
            className={fieldClass}
          >
            {variant.consignment_lots.map((lot) => (
              <option key={lot.id} value={lot.id}>
                {formatDateTime(lot.created_at)} · ARMA{" "}
                {formatMoney(lot.unit_price)} / pieza · {lot.available}{" "}
                disponibles
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-5 text-arma-muted">
            Cada entrega conserva su precio. Si necesitas piezas de dos
            entregas, registra una operación por cada una.
          </p>
        </div>
      ) : null}
      {stockMode === "waiting" || scope !== "mine" || delivery ? (
        <OrderForm
          key={lotId}
          kind={kind}
          variant={variant}
          productName={productName}
          delivery={stockMode === "waiting" ? undefined : delivery}
          stockMode={stockMode}
          stockSource={source}
          onBusyChange={setBusy}
          onClose={onClose}
        />
      ) : (
        <p role="alert" className="text-sm text-arma-red">
          No tienes una entrega disponible para esta variante. Actualiza el
          producto.
        </p>
      )}
    </Modal>
  );
}
