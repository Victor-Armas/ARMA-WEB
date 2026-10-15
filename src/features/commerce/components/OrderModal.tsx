import { useState } from "react";
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
            {scope === "mine"
              ? "Cobro recibido por el vendedor"
              : "Venta del inventario del taller"}
          </p>
        </div>
      </div>
      {scope === "mine" ? (
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
      {scope !== "mine" || delivery ? (
        <OrderForm
          key={lotId}
          kind={kind}
          variant={variant}
          productName={productName}
          delivery={delivery}
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
