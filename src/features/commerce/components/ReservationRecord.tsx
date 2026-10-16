import { CustomerWhatsAppLink } from "./CustomerWhatsAppLink";
import { CommerceHistory } from "./CommerceHistory";
import { useAppAccess } from "@/features/access/hooks/useAppAccess";
import { Link } from "react-router";
import { CalendarDays } from "lucide-react";
import type { CommerceOrder } from "../schemas/commerce.schema";
import {
  formatMoney,
  formatDate,
  formatCalendarDate,
  paymentLabels,
  todayInMonterrey,
} from "../utils/commerce-format";
import { ReservationAction } from "./ReservationAction";
import { OrderLineItems } from "./OrderLineItems";
import { DeliveryConfirmation } from "./DeliveryConfirmation";
import { DeliveryDateEditor } from "./DeliveryDateEditor";

const statusLabels = {
  active: "Activo",
  cancelled: "Cancelado",
  fulfilled: "Pagado",
  completed: "Venta registrada",
};
export function ReservationRecord({
  order,
  canWrite,
  embedded = false,
}: {
  order: CommerceOrder;
  canWrite: boolean;
  embedded?: boolean;
}) {
  const access = useAppAccess();
  const today = todayInMonterrey();
  const pendingDelivery =
    (order.status === "active" || order.status === "fulfilled") &&
    !order.delivered_at;
  const deliveryLate =
    pendingDelivery &&
    order.delivery_date !== null &&
    order.delivery_date < today;
  const paymentLate =
    order.status === "active" &&
    order.due_date !== null &&
    order.due_date < today;
  return (
    <article
      className={
        embedded
          ? ""
          : "rounded-arma border border-arma-border bg-arma-surface px-4 py-5 sm:px-6"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          Apartado #{String(order.order_number).padStart(4, "0")}
        </h2>
        <span
          className={`rounded-arma px-2 py-1 text-xs font-medium ${deliveryLate ? "bg-arma-red-soft text-arma-red" : order.status === "active" ? "bg-arma-warning-soft text-arma-warning" : "bg-arma-neutral-soft text-arma-neutral"}`}
        >
          {order.delivered_at
            ? "Entregado"
            : deliveryLate
              ? "Entrega atrasada"
              : statusLabels[order.status]}
        </span>
      </div>
      <p className="mt-2 text-xs text-arma-muted">
        {formatDate(order.created_at)} · {order.seller_name}
      </p>
      <p className="mt-4 break-words text-sm font-semibold">
        {order.customer_name}
      </p>
      {order.customer_phone ? (
        <CustomerWhatsAppLink phone={order.customer_phone} />
      ) : null}
      <div className="mt-2">
        <OrderLineItems items={order.items} />
      </div>
      <div className="border-y border-arma-border py-4">
        <p className="flex items-center gap-2 text-xs font-medium text-arma-muted">
          <CalendarDays size={17} aria-hidden="true" />
          Compromiso de entrega
        </p>
        <p
          className={`mt-2 text-base font-semibold ${deliveryLate ? "text-arma-red" : ""}`}
        >
          {order.delivery_date
            ? formatCalendarDate(order.delivery_date)
            : "Sin fecha programada"}
        </p>
        {pendingDelivery &&
        canWrite &&
        access.can("reservations.edit_delivery") ? (
          <DeliveryDateEditor id={order.id} date={order.delivery_date} />
        ) : null}
      </div>
      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 tabular-nums">
        <div>
          <dt className="text-xs text-arma-muted">Total</dt>
          <dd className="mt-1 text-lg font-semibold">
            {formatMoney(order.total)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-arma-muted">Abonos acumulados</dt>
          <dd className="mt-1 font-medium">{formatMoney(order.deposit)}</dd>
        </div>
        <div>
          <dt className="text-xs text-arma-muted">
            {order.status === "cancelled"
              ? "Devuelto"
              : order.status === "fulfilled"
                ? "Saldo cobrado"
                : "Saldo pendiente"}
          </dt>
          <dd className="mt-1 font-medium">
            {formatMoney(
              order.status === "cancelled"
                ? order.refunded_amount
                : order.total - order.deposit,
            )}
          </dd>
        </div>
      </dl>
      {order.payment_method ? (
        <p className="mt-3 text-xs text-arma-muted">
          Primer medio registrado: {paymentLabels[order.payment_method]}
        </p>
      ) : null}
      {order.due_date ? (
        <p
          className={`mt-2 text-xs ${paymentLate ? "text-arma-red" : "text-arma-muted"}`}
        >
          Fecha límite de pago: {formatCalendarDate(order.due_date)}
          {paymentLate ? " · Pendiente de revisión" : ""}
        </p>
      ) : null}
      {order.notes ? (
        <p className="mt-3 whitespace-pre-wrap break-words text-sm text-arma-muted">
          {order.notes}
        </p>
      ) : null}
      {order.sale_id && access.can("sales.read") ? (
        <Link
          to="/sales"
          className="mt-3 inline-block text-sm text-arma-active underline underline-offset-4"
        >
          Consultar venta
        </Link>
      ) : null}
      {order.delivered_at ? (
        <p className="mt-3 text-sm font-medium text-arma-green">
          Entrega confirmada el {formatDate(order.delivered_at)}
        </p>
      ) : order.status === "fulfilled" &&
        canWrite &&
        access.can("reservations.deliver") ? (
        <DeliveryConfirmation id={order.id} />
      ) : null}
      {order.status === "active" &&
      canWrite &&
      (access.can("sales.complete") || access.can("reservations.cancel")) ? (
        <ReservationAction
          order={order}
          canComplete={access.can("sales.complete")}
          canCancel={access.can("reservations.cancel")}
        />
      ) : null}
      <CommerceHistory order={order} />
    </article>
  );
}
