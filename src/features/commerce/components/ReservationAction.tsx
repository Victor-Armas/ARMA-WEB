import { useId, useState } from "react";
import { notify } from "@/lib/notify";
import { useCommerceMutations } from "../hooks/useCommerce";
import { commerceError } from "../services/commerce.service";
import type { CommerceOrder, PaymentMethod } from "../schemas/commerce.schema";
import {
  formatMoney,
  paymentLabels,
  fieldClass,
  primaryButton,
  secondaryButton,
} from "../utils/commerce-format";
import { FormField } from "./FormField";

export function ReservationAction({
  order,
  canComplete,
  canCancel,
}: {
  order: CommerceOrder;
  canComplete: boolean;
  canCancel: boolean;
}) {
  const refundId = useId();
  const [action, setAction] = useState<"complete" | "cancel" | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [refund, setRefund] = useState(false);
  const [requestId] = useState(() => crypto.randomUUID());
  const { resolve } = useCommerceMutations();
  async function submit() {
    if (
      !action ||
      (action === "complete" && !canComplete) ||
      (action === "cancel" && !canCancel)
    )
      return;
    const id = notify.loading(
      action === "complete" ? "Completando venta…" : "Cancelando apartado…",
    );
    try {
      await resolve.mutateAsync({
        id: order.id,
        action,
        requestId,
        paymentMethod: method,
        refundConfirmed: refund,
      });
      notify.success(
        action === "complete"
          ? "Apartado convertido en venta"
          : "Apartado cancelado",
        { id },
      );
      setAction(null);
    } catch (error: unknown) {
      notify.error(commerceError(error), { id });
    }
  }
  if (!action)
    return (
      <div className="mt-4 flex flex-wrap gap-3">
        {canComplete ? (
          <button
            type="button"
            onClick={() => setAction("complete")}
            className={primaryButton}
          >
            Completar venta
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            onClick={() => setAction("cancel")}
            className={secondaryButton}
          >
            Cancelar apartado
          </button>
        ) : null}
      </div>
    );
  return (
    <div className="mt-4 border-t border-arma-border pt-4">
      <p className="text-sm font-semibold">
        {action === "complete"
          ? `Confirma el cobro del saldo: ${formatMoney(order.total - order.deposit)}`
          : order.stock_status === "waiting"
            ? "Se cancelará el pedido pendiente. No hay piezas reservadas que liberar."
            : "Las piezas del apartado volverán a estar disponibles."}
      </p>
      {action === "complete" ? (
        <div className="mt-4 max-w-xs">
          <FormField label="Forma de pago del saldo">
            {(id) => (
              <select
                id={id}
                disabled={resolve.isPending}
                value={method}
                onChange={(event) => {
                  const value = event.target.value;
                  if (
                    value === "cash" ||
                    value === "transfer" ||
                    value === "card"
                  )
                    setMethod(value);
                }}
                className={fieldClass}
              >
                {Object.entries(paymentLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        </div>
      ) : order.deposit > 0 ? (
        <label
          htmlFor={refundId}
          className="mt-4 flex min-h-11 items-start gap-3 text-sm"
        >
          <input
            id={refundId}
            type="checkbox"
            checked={refund}
            disabled={resolve.isPending}
            onChange={(event) => setRefund(event.target.checked)}
            className="mt-1 size-5 accent-arma-active"
          />
          Ya devolví los abonos de {formatMoney(order.deposit)} por los mismos
          medios en que se recibieron.
        </label>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={
            resolve.isPending ||
            (action === "cancel" && order.deposit > 0 && !refund)
          }
          onClick={() => void submit()}
          className={primaryButton}
        >
          {resolve.isPending
            ? "Guardando…"
            : action === "complete"
              ? "Confirmar cobro y venta"
              : "Confirmar cancelación"}
        </button>
        <button
          type="button"
          disabled={resolve.isPending}
          onClick={() => setAction(null)}
          className={secondaryButton}
        >
          Volver
        </button>
      </div>
    </div>
  );
}
