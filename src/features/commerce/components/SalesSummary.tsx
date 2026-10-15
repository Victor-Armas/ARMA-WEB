import { Banknote, CreditCard, Landmark } from "lucide-react";
import { Link } from "react-router";
import type { SalesSummaryData } from "../schemas/commerce.schema";
import { formatMoney, paymentLabels } from "../utils/commerce-format";
const paymentIcons = { cash: Banknote, transfer: Landmark, card: CreditCard };
export function SalesSummary({ summary }: { summary: SalesSummaryData }) {
  const collected = summary.revenue - summary.applied_deposits;
  return (
    <section
      aria-label="Resumen de ventas del período y búsqueda seleccionados"
      className="mt-6 grid overflow-hidden rounded-arma border border-arma-border lg:grid-cols-2"
    >
      <div className="min-w-0 bg-arma-green p-5 text-white sm:p-6">
        <h2 className="text-base font-semibold">Valor de las ventas</h2>
        <p className="mt-3 break-words font-arma-heading text-4xl tracking-[-0.03em] tabular-nums sm:text-5xl">
          {formatMoney(summary.revenue)}
        </p>
        <p className="mt-3 text-sm leading-6 text-white/90">
          Importe vendido en el período y con los filtros seleccionados.
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-5 border-t border-white/25 pt-5 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-white/90">Ventas registradas</dt>
            <dd className="mt-2 text-xl font-semibold tabular-nums">
              {summary.orders}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-white/90">Piezas vendidas</dt>
            <dd className="mt-2 text-xl font-semibold tabular-nums">
              {summary.pieces}
            </dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-xs text-white/90">Promedio por venta</dt>
            <dd className="mt-2 break-words text-xl font-semibold tabular-nums">
              {formatMoney(summary.average_ticket)}
            </dd>
          </div>
        </dl>
        {summary.discounts > 0 ? (
          <p className="mt-5 text-xs leading-5 text-white/90">
            Descuentos frente al catálogo: {formatMoney(summary.discounts)}
          </p>
        ) : null}
      </div>
      <div className="min-w-0 bg-arma-info-soft p-5 text-arma-info sm:p-6">
        <h2 className="text-base font-semibold">
          Cobrado al cerrar las ventas
        </h2>
        <p className="mt-3 break-words font-arma-heading text-4xl tracking-[-0.03em] tabular-nums">
          {formatMoney(collected)}
        </p>
        <p className="mt-3 text-sm leading-6">
          Abonos previos aplicados:{" "}
          <strong className="tabular-nums">
            {formatMoney(summary.applied_deposits)}
          </strong>
        </p>
        <dl className="mt-5 divide-y divide-arma-info/20 border-y border-arma-info/20">
          {(["cash", "transfer", "card"] as const).map((method) => {
            const amount = summary.payments
              .filter((payment) => payment.method === method)
              .reduce((sum, payment) => sum + payment.amount, 0);
            const Icon = paymentIcons[method];
            return (
              <div
                key={method}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <dt className="flex items-center gap-3">
                  <Icon size={18} aria-hidden="true" />
                  {paymentLabels[method]}
                </dt>
                <dd className="font-semibold tabular-nums">
                  {formatMoney(amount)}
                </dd>
              </div>
            );
          })}
        </dl>
        <p className="mt-4 text-xs leading-5">
          Importes anteriores a devoluciones.{" "}
          <Link to="/" className="font-semibold underline underline-offset-4">
            Consulta cobros y reembolsos netos en Inicio.
          </Link>
        </p>
      </div>
    </section>
  );
}
