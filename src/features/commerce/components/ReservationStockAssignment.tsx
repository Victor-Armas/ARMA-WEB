import { useId, useState } from "react";
import { PackageCheck } from "lucide-react";
import { notify } from "@/lib/notify";
import { useReservationStock } from "../hooks/useReservationStock";
import { useCommerceMutations } from "../hooks/useCommerce";
import { commerceError } from "../services/commerce.service";
import type { CommerceOrder } from "../schemas/commerce.schema";
import {
  fieldClass,
  primaryButton,
  secondaryButton,
  formatMoney,
  formatDateTime,
} from "../utils/commerce-format";
export function ReservationStockAssignment({
  order,
  canAssign,
}: {
  order: CommerceOrder;
  canAssign: boolean;
}) {
  const query = useReservationStock(order.id);
  const { assignStock } = useCommerceMutations();
  const [deliveryId, setDeliveryId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const id = useId();
  const data = query.data;
  const lot = data?.lots.find((l) => l.id === deliveryId);
  const available =
    data?.source === "seller" ? (lot?.available ?? 0) : (data?.available ?? 0);
  const valid = Boolean(
    data &&
    available >= data.quantity &&
    (data.source === "warehouse" || (lot && lot.unit_price <= data.unit_price)),
  );
  async function assign() {
    const message = notify.loading("Asignando existencia…");
    try {
      await assignStock.mutateAsync({
        id: order.id,
        deliveryId: data?.source === "seller" ? deliveryId : null,
      });
      notify.success("Existencia reservada para este apartado", {
        id: message,
      });
    } catch (e: unknown) {
      setConfirmed(false);
      notify.error(commerceError(e), { id: message });
    }
  }
  return (
    <section className="mt-5 rounded-arma bg-arma-info-soft p-4 text-arma-info">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <PackageCheck size={19} aria-hidden="true" />
        Pendiente de existencia
      </h3>
      <p className="mt-2 text-sm leading-6">
        Este pedido todavía no tiene piezas reservadas. Conserva sus abonos y
        fecha de entrega.{" "}
        {order.stock_source === "seller"
          ? "Se surtirá con mercancía asignada al vendedor del apartado."
          : "Se surtirá desde el inventario del taller."}
      </p>
      {query.isPending ? (
        <p role="status" className="mt-3 text-sm">
          Consultando disponibilidad…
        </p>
      ) : query.isError ? (
        <div role="alert" className="mt-3">
          <p className="text-sm">No pudimos consultar la existencia.</p>
          <button
            type="button"
            className={`${secondaryButton} mt-3`}
            onClick={() => void query.refetch()}
          >
            Reintentar
          </button>
        </div>
      ) : (
        data && (
          <>
            <p className="mt-3 text-sm font-semibold">
              Solicitadas: {data.quantity} piezas · Disponibles:{" "}
              {data.available}
            </p>
            {data.source === "seller" && canAssign ? (
              <div className="mt-4">
                <label htmlFor={id} className="mb-2 block text-sm font-medium">
                  Entrega del vendedor
                </label>
                <select
                  id={id}
                  value={deliveryId}
                  disabled={assignStock.isPending}
                  onChange={(e) => {
                    setDeliveryId(e.target.value);
                    setConfirmed(false);
                  }}
                  className={fieldClass}
                >
                  <option value="">Seleccionar entrega</option>
                  {data.lots.map((l) => (
                    <option
                      key={l.id}
                      value={l.id}
                      disabled={
                        l.available < data.quantity ||
                        l.unit_price > data.unit_price
                      }
                    >
                      {formatDateTime(l.created_at)} · {l.available} piezas ·
                      ARMA {formatMoney(l.unit_price)} c/u
                      {l.unit_price > data.unit_price
                        ? " · supera el precio al cliente"
                        : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs leading-5">
                  La cantidad completa debe estar disponible en una sola
                  entrega. No se crea una deuda nueva al asignarla aquí.
                </p>
              </div>
            ) : null}
            {canAssign ? (
              <>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={assignStock.isPending || query.isFetching}
                    className={secondaryButton}
                    onClick={() => {
                      setConfirmed(false);
                      void query.refetch();
                    }}
                  >
                    Actualizar existencia
                  </button>
                  {valid && !confirmed ? (
                    <button
                      type="button"
                      className={primaryButton}
                      onClick={() => setConfirmed(true)}
                    >
                      Asignar existencia
                    </button>
                  ) : null}
                </div>
                {!valid ? (
                  <p className="mt-3 text-xs leading-5">
                    Cuando haya suficientes piezas
                    {data.source === "seller"
                      ? " en una entrega del vendedor"
                      : ""}
                    , podrás reservarlas aquí. Este pedido permanece en la lista
                    de pendientes.
                  </p>
                ) : confirmed ? (
                  <div className="mt-4 border-t border-current/20 pt-4">
                    <p className="text-sm leading-6">
                      Se reservarán {data.quantity} piezas disponibles para este
                      cliente. El anticipo y el total del apartado se conservan.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={assignStock.isPending || query.isFetching}
                        className={primaryButton}
                        onClick={() => void assign()}
                      >
                        {assignStock.isPending
                          ? "Asignando…"
                          : "Confirmar asignación"}
                      </button>
                      <button
                        type="button"
                        disabled={assignStock.isPending}
                        className={secondaryButton}
                        onClick={() => setConfirmed(false)}
                      >
                        Volver
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </>
        )
      )}
    </section>
  );
}
