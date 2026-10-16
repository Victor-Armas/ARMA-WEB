import { CustomerWhatsAppLink } from "./CustomerWhatsAppLink";
import { CommerceHistory } from "./CommerceHistory";
import type { CommerceOrder } from "../schemas/commerce.schema";
import { OrderLineItems } from "./OrderLineItems";
import {
  formatMoney,
  formatDateTime,
  paymentLabels,
} from "../utils/commerce-format";

export function SaleRecord({ order }: { order: CommerceOrder }) {
  const pieces = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <article className="overflow-hidden rounded-arma border border-arma-border bg-arma-surface">
      <header
        className={`flex flex-wrap items-start justify-between gap-4 border-b border-arma-border px-4 py-4 sm:px-5 ${order.source_reservation_id ? "bg-arma-info-soft text-arma-info" : "bg-arma-green-soft text-arma-green"}`}
      >
        <div>
          <h3 className="text-lg font-semibold">
            Venta #{String(order.order_number).padStart(4, "0")}
          </h3>
          <p className="mt-1 text-xs">{formatDateTime(order.created_at)}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-xs font-medium">Total de la venta</p>
          <p className="mt-1 break-words text-2xl font-semibold tabular-nums">
            {formatMoney(order.total)}
          </p>
          <p className="mt-1 text-xs">
            {order.source_reservation_id
              ? "Venta de apartado"
              : "Venta directa"}
          </p>
        </div>
      </header>
      <div className="px-4 py-5 sm:px-5">
        <dl className="grid gap-4 border-b border-arma-border pb-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-arma-muted">Cliente</dt>
            <dd className="mt-1 break-words text-sm font-semibold">
              {order.customer_name || "Venta de mostrador"}
            </dd>
            {order.customer_phone ? (
              <dd className="mt-1">
                <CustomerWhatsAppLink phone={order.customer_phone} />
              </dd>
            ) : null}
          </div>
          <div>
            <dt className="text-xs text-arma-muted">Registrada por</dt>
            <dd className="mt-1 text-sm font-semibold">{order.seller_name}</dd>
            <dd className="mt-1 text-xs text-arma-muted">
              {pieces} {pieces === 1 ? "pieza" : "piezas"} ·{" "}
              {order.payment_method
                ? paymentLabels[order.payment_method]
                : "Sin forma de pago"}
            </dd>
          </div>
        </dl>
        <section
          aria-label={`Productos de la venta ${order.order_number}`}
          className="mt-5"
        >
          <h4 className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
            Productos vendidos{" "}
            <span className="text-xs font-medium text-arma-muted">
              {pieces} {pieces === 1 ? "pieza" : "piezas"}
            </span>
          </h4>
          <OrderLineItems items={order.items} detailed />
        </section>
        {order.notes ? (
          <div className="border-t border-arma-border py-4">
            <h4 className="text-xs font-semibold text-arma-muted">
              Notas de la venta
            </h4>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">
              {order.notes}
            </p>
          </div>
        ) : null}
        <div className="mt-2 rounded-arma bg-arma-info-soft p-4 text-arma-info">
          <h4 className="mb-3 text-sm font-semibold">Cómo se cobró</h4>
          <div className="text-sm">
            {order.source_reservation_id ? (
              <dl className="space-y-2 tabular-nums">
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-arma-info">Abonos previos aplicados</dt>
                  <dd>{formatMoney(order.source_deposit)}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-arma-info">Cobrado al cerrar</dt>
                  <dd>{formatMoney(order.total - order.source_deposit)}</dd>
                </div>
              </dl>
            ) : (
              <p className="leading-6">
                Pago completo registrado
                {order.payment_method
                  ? ` en ${paymentLabels[order.payment_method].toLowerCase()}`
                  : ""}
                .
              </p>
            )}
          </div>
        </div>
        <CommerceHistory order={order} />
      </div>
    </article>
  );
}
