import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/features/commerce/components/FormField";
import {
  fieldClass,
  primaryButton,
} from "@/features/commerce/utils/commerce-format";
import { useOperation } from "../hooks/useOperations";
import type { ProductionOrder } from "../schemas/operations.schema";
import { OperationFeedback } from "./OperationFeedback";
export function ProductionCloseModal({
  order,
  cancel,
  onClose,
}: {
  order: ProductionOrder;
  cancel: boolean;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(String(order.planned_quantity));
  const [confirmed, setConfirmed] = useState(false);
  const op = useOperation(
    cancel ? "cancel" : "finish",
    cancel
      ? "Armado cancelado; insumos liberados"
      : "Armado terminado; inventario actualizado",
  );
  const valid =
    /^\d+$/.test(quantity) && Number(quantity) <= order.planned_quantity;
  async function submit() {
    if (
      await op.execute({
        order_id: order.id,
        quantity: cancel ? 0 : Number(quantity),
      })
    )
      onClose();
  }
  return (
    <Modal
      title={cancel ? "Cancelar armado" : "Confirmar producto terminado"}
      onClose={onClose}
      busy={op.busy || op.uncertain}
    >
      <p className="text-sm font-semibold">{order.label}</p>
      <p className="mt-2 text-sm text-arma-muted">
        Planeadas: {order.planned_quantity} piezas.
      </p>
      <fieldset disabled={op.busy || op.uncertain} className="mt-5 space-y-4">
        {!cancel ? (
          <FormField label="Piezas realmente terminadas">
            {(id) => (
              <input
                id={id}
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={fieldClass}
              />
            )}
          </FormField>
        ) : null}
        <p className="text-sm leading-6 text-arma-muted">
          {cancel
            ? "Se liberarán todos los insumos reservados."
            : `Se sumarán ${valid ? quantity : "…"} piezas al producto terminado. Solo se consumirán los materiales de esas piezas; el resto se libera. Si hubo desperdicios, no cierres esta orden como si los insumos estuvieran intactos.`}
        </p>
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 size-5 accent-arma-active"
          />
          Confirmo las cantidades y que los insumos no utilizados siguen en
          inventario.
        </label>
      </fieldset>
      <OperationFeedback
        uncertain={op.uncertain}
        busy={op.busy}
        retry={() => {
          void op.retry().then((saved) => {
            if (saved) {
              onClose();
            }
          });
        }}
      />
      <button
        type="button"
        className={`${primaryButton} mt-5`}
        disabled={op.busy || op.uncertain || !confirmed || (!cancel && !valid)}
        onClick={() => void submit()}
      >
        {op.busy
          ? "Guardando…"
          : cancel
            ? "Confirmar cancelación"
            : "Finalizar y actualizar stock"}
      </button>
    </Modal>
  );
}
