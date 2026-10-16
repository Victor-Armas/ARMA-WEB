import { CustomerWhatsAppLink } from "./CustomerWhatsAppLink";
import { ProductImage } from "@/features/products/components/ProductImage";
import type { CommerceOrder } from "../schemas/commerce.schema";
import {
  formatCalendarDate,
  formatMoney,
  secondaryButton,
} from "../utils/commerce-format";
export function ReservationListCard({
  order,
  today,
  onDetail,
}: {
  order: CommerceOrder;
  today: string;
  onDetail: () => void;
}) {
  const pending =
    (order.status === "active" || order.status === "fulfilled") &&
    !order.delivered_at;
  const late =
    pending && order.delivery_date !== null && order.delivery_date < today;
  const state =
    order.status === "cancelled"
      ? "Cancelado"
      : order.delivered_at
        ? "Entregado"
        : order.status === "fulfilled"
          ? "Pagado"
          : "Pendiente de pago";
  const badge =
    order.status === "cancelled"
      ? "bg-arma-neutral-soft text-arma-neutral"
      : order.delivered_at
        ? "bg-arma-green-soft text-arma-green"
        : order.status === "fulfilled"
          ? "bg-arma-info-soft text-arma-info"
          : "bg-arma-warning-soft text-arma-warning";
  return (
    <article className="border-b border-arma-border py-5 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 break-words text-base font-semibold">
          #{String(order.order_number).padStart(4, "0")} ·{" "}
          {order.customer_name || "Cliente sin nombre"}
        </h3>
        <span
          className={`shrink-0 rounded-arma px-2 py-1 text-[11px] font-medium ${badge}`}
        >
          {state}
        </span>
      </div>
      {order.customer_phone ? (
        <CustomerWhatsAppLink phone={order.customer_phone} />
      ) : null}
      <ul className="mt-3 space-y-3">
        {order.items.map((item) => (
          <li
            key={item.id}
            className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-3"
          >
            <button
              type="button"
              onClick={onDetail}
              aria-label={`Ver detalle de ${item.product_name}, apartado ${order.order_number}`}
              className="overflow-hidden rounded-arma bg-arma-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active"
            >
              <ProductImage
                src={item.cover_url}
                alt={item.product_name}
                width={76}
                height={95}
                loading="eager"
                className="aspect-[4/5] h-auto w-full object-cover"
              />
            </button>
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold">
                {item.product_name}
              </p>
              <p className="mt-1 text-xs text-arma-muted">
                {item.color} · {item.size}
              </p>
              <p className="mt-2 text-sm font-medium tabular-nums">
                {item.quantity} {item.quantity === 1 ? "pieza" : "piezas"} ·{" "}
                {formatMoney(item.unit_price)} c/u
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p
        className={`mt-4 text-xs font-medium ${late ? "text-arma-red" : "text-arma-muted"}`}
      >
        {order.delivery_date
          ? `${late ? "Entrega atrasada · " : order.delivered_at ? "Fecha comprometida · " : "Entrega · "}${formatCalendarDate(order.delivery_date)}`
          : "Sin fecha de entrega asignada"}
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2 tabular-nums">
        <div>
          <dt className="text-[11px] text-arma-muted">Total</dt>
          <dd className="mt-1 text-sm font-medium">
            {formatMoney(order.total)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-arma-muted">Abonado</dt>
          <dd className="mt-1 text-sm font-medium">
            {formatMoney(order.deposit)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-arma-muted">
            {order.status === "cancelled" ? "Devuelto" : "Saldo pendiente"}
          </dt>
          <dd
            className={`mt-1 text-sm font-semibold ${pending && order.status === "active" ? "text-arma-active" : ""}`}
          >
            {formatMoney(
              order.status === "cancelled"
                ? order.refunded_amount
                : order.status === "fulfilled" || order.delivered_at
                  ? 0
                  : order.total - order.deposit,
            )}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-xs text-arma-muted">
          Por {order.seller_name}
        </p>
        <button type="button" onClick={onDetail} className={secondaryButton}>
          Ver detalle
        </button>
      </div>
    </article>
  );
}
