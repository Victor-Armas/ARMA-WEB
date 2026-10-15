import { PackageCheck, CalendarClock } from "lucide-react";
import { ProductImage } from "@/features/products/components/ProductImage";
import { useAppAccess } from "@/features/access/hooks/useAppAccess";
import {
  formatDateTime,
  formatMoney,
  secondaryButton,
  primaryButton,
} from "@/features/commerce/utils/commerce-format";
import type { ProductionOrder } from "../schemas/operations.schema";
export function ProductionOrderCard({
  order,
  onClose,
}: {
  order: ProductionOrder;
  onClose: (cancel: boolean) => void;
}) {
  const access = useAppAccess();
  const active = order.status === "draft";
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-arma border border-arma-border bg-arma-surface">
      <header
        className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 ${active ? "bg-arma-info-soft text-arma-info" : order.status === "completed" ? "bg-arma-green-soft text-arma-green" : "bg-arma-neutral-soft text-arma-neutral"}`}
      >
        <h2 className="text-sm font-semibold">
          Armado #{String(order.order_number).padStart(4, "0")}
        </h2>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
          {active ? <CalendarClock size={16} /> : <PackageCheck size={16} />}{" "}
          {active
            ? "En proceso"
            : order.status === "completed"
              ? "Terminado"
              : "Cancelado"}
        </span>
      </header>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex gap-4">
          <div className="h-28 w-24 shrink-0">
            <ProductImage
              src={order.photo_url ?? null}
              background={order.photo?.background}
              alt={order.label}
              className="h-full w-full rounded-arma object-contain"
            />
          </div>
          <div className="min-w-0">
            <h3 className="break-words text-base font-semibold">
              {order.label}
            </h3>
            <p className="mt-2 text-xs leading-5 text-arma-muted">
              {formatDateTime(order.created_at)}
            </p>
            <p className="mt-2 text-lg font-semibold tabular-nums">
              {active ? order.planned_quantity : (order.actual_quantity ?? 0)}{" "}
              <span className="text-xs font-normal text-arma-muted">
                {active ? "por terminar" : "terminadas"}
              </span>
            </p>
            {!active ? (
              <p className="mt-1 text-xs text-arma-muted">
                {order.planned_quantity} planeadas
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 divide-y divide-arma-border border-y border-arma-border">
          {order.inputs.map((input, index) => (
            <div
              key={input.label + index}
              className="flex items-center gap-3 py-3"
            >
              <div className="h-14 w-12 shrink-0">
                <ProductImage
                  src={input.photo_url ?? null}
                  background={input.photo?.background}
                  alt={input.label}
                  className="h-full w-full rounded-arma object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-words text-xs font-medium">{input.label}</p>
                <p className="mt-1 text-xs text-arma-muted">
                  {active
                    ? `${input.quantity} reservadas`
                    : `${(order.actual_quantity ?? 0) * input.per_unit} usadas`}
                </p>
              </div>
            </div>
          ))}
        </div>
        {order.notes ? (
          <p className="mt-3 break-words text-sm leading-6 text-arma-muted">
            {order.notes}
          </p>
        ) : null}
        {active ? (
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            {access.can("production.complete") ? (
              <button
                type="button"
                className={primaryButton}
                onClick={() => onClose(false)}
              >
                Finalizar armado
              </button>
            ) : null}
            {access.can("production.cancel") ? (
              <button
                type="button"
                className={secondaryButton}
                onClick={() => onClose(true)}
              >
                Cancelar
              </button>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-xs text-arma-muted">
            Costo final por pieza:{" "}
            <strong className="font-medium text-arma-text">
              {order.unit_cost === null
                ? "sin costo completo registrado"
                : formatMoney(order.unit_cost)}
            </strong>
          </p>
        )}
      </div>
    </article>
  );
}
