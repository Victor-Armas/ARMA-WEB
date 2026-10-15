import { useState } from "react";
import { useAppAccess } from "@/features/access/hooks/useAppAccess";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { useCommerceHistory } from "../hooks/useCommerceHistory";
import type { CommerceOrder } from "../schemas/commerce.schema";
import {
  secondaryButton,
  formatMoney,
  formatDateTime,
  paymentLabels,
} from "../utils/commerce-format";
import { PaymentModal } from "./PaymentModal";
import { ReturnModal } from "./ReturnModal";
const kindLabels = {
  sale: "Cobro de venta",
  deposit: "Pago inicial",
  payment: "Abono",
  cancellation: "Reembolso de cancelación",
  return: "Reembolso de devolución",
};
export function CommerceHistory({ order }: { order: CommerceOrder }) {
  const query = useCommerceHistory(order.id);
  const access = useAppAccess();
  const uid = useAuthStore((s) => s.session?.user.id);
  const canManage =
    uid === order.created_by || access.can("commerce.manage_all");
  const [modal, setModal] = useState<"payment" | "return" | null>(null);
  const data = query.data;
  const totalReturned = data?.returns.reduce((s, r) => s + r.quantity, 0) ?? 0;
  const refunded = data?.returns.reduce((s, r) => s + r.refund, 0) ?? 0;
  return (
    <section className="mt-5 border-t border-arma-border pt-4">
      {query.isError ? (
        <div role="alert">
          <p className="text-sm text-arma-red">
            No pudimos cargar los cobros y devoluciones.
          </p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className={`${secondaryButton} mt-2`}
          >
            Reintentar
          </button>
        </div>
      ) : null}
      {query.isPending ? (
        <p role="status" className="text-xs text-arma-muted">
          Consultando movimientos…
        </p>
      ) : null}
      {data && order.kind === "sale" && totalReturned > 0 ? (
        <p className="mb-3 text-sm font-semibold text-arma-red">
          {totalReturned} piezas devueltas · {formatMoney(refunded)}{" "}
          reembolsados · Neto de venta: {formatMoney(order.total - refunded)}
        </p>
      ) : null}
      {data ? (
        <details>
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-arma-active">
            Historial de cobros{order.kind === "sale" ? " y devoluciones" : ""}
          </summary>
          {!data.payments.length ? (
            <p className="py-3 text-sm text-arma-muted">
              Todavía no hay pagos registrados.
            </p>
          ) : (
            <ul className="divide-y divide-arma-border">
              {data.payments.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap justify-between gap-2 py-3 text-sm"
                >
                  <div>
                    <p>
                      {kindLabels[p.kind]} · {paymentLabels[p.method]}
                    </p>
                    <p className="mt-1 text-xs text-arma-muted">
                      {formatDateTime(p.created_at)}
                    </p>
                  </div>
                  <p
                    className={`font-semibold tabular-nums ${p.amount < 0 ? "text-arma-red" : ""}`}
                  >
                    {formatMoney(p.amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {data.returns.map((r) => (
            <div
              key={r.id}
              className="border-t border-arma-border py-3 text-sm"
            >
              <p className="font-medium">
                {r.quantity} piezas ·{" "}
                {r.restock
                  ? "Devueltas al stock vendible"
                  : "Fuera del stock vendible"}
              </p>
              <p className="mt-1 break-words text-arma-muted">{r.reason}</p>
            </div>
          ))}
        </details>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-3">
        {canManage &&
        access.can("reservations.payments") &&
        order.kind === "reservation" &&
        order.status === "active" &&
        order.deposit < order.total ? (
          <button
            type="button"
            onClick={() => setModal("payment")}
            className={secondaryButton}
          >
            Registrar abono
          </button>
        ) : null}
        {canManage &&
        access.can("sales.returns") &&
        order.kind === "sale" &&
        data &&
        totalReturned < order.items.reduce((s, i) => s + i.quantity, 0) ? (
          <button
            type="button"
            onClick={() => setModal("return")}
            className={secondaryButton}
          >
            Registrar devolución
          </button>
        ) : null}
      </div>
      {modal === "payment" ? (
        <PaymentModal order={order} onClose={() => setModal(null)} />
      ) : modal === "return" && data ? (
        <ReturnModal
          order={order}
          history={data}
          onClose={() => setModal(null)}
        />
      ) : null}
    </section>
  );
}
