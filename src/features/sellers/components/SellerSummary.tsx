import { formatMoney } from "@/features/commerce/utils/commerce-format";
import type { SellerOverview } from "../schemas/seller.schema";
export function SellerSummary({
  summary: s,
}: {
  summary: SellerOverview["summary"];
}) {
  return (
    <section aria-label="Cuenta de mercancía asignada" className="mt-6">
      <div className="grid overflow-hidden rounded-arma border border-arma-border md:grid-cols-2">
        <div className="bg-arma-green p-5 text-white">
          <h2 className="text-sm font-semibold">Ganancia del vendedor</h2>
          <p className="mt-3 break-words text-3xl font-semibold tabular-nums">
            {formatMoney(s.earned)}
          </p>
          <p className="mt-2 text-xs leading-5 text-white/90">
            Ventas de mercancía asignada, menos devoluciones e importe para
            ARMA. Antes de gastos propios.
          </p>
        </div>
        <div className="bg-arma-info-soft p-5 text-arma-info">
          <h2 className="text-sm font-semibold">
            {s.due < 0
              ? "Saldo a favor del vendedor"
              : "Pendiente de entregar a ARMA"}
          </h2>
          <p className="mt-3 break-words text-3xl font-semibold tabular-nums">
            {formatMoney(Math.abs(s.due))}
          </p>
          <p className="mt-2 text-xs leading-5">
            {s.due < 0
              ? "Crédito generado después de devoluciones. Administración puede registrar su reintegro."
              : "Compras a crédito y piezas vendidas en consignación, menos los pagos recibidos. Las compras ya pagadas no añaden deuda."}
          </p>
          <p className="mt-3 text-xs leading-5">
            Compras: {formatMoney(s.purchases)} · Consignación vendida:{" "}
            {formatMoney(s.consignment_owed)}
          </p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4 rounded-arma border border-arma-border bg-arma-surface p-5 lg:grid-cols-4">
        {[
          {
            label: "Ventas netas de devoluciones",
            value: formatMoney(s.revenue),
          },
          {
            label: "Importe acumulado para ARMA",
            value: formatMoney(s.owed),
          },
          {
            label: "Entregado a ARMA, menos reintegros",
            value: formatMoney(s.paid),
          },
          { label: "Piezas vendidas netas", value: s.sold },
          { label: "Piezas en poder del vendedor", value: s.physical },
          { label: "Apartadas", value: s.reserved },
          {
            label: "Disponibles para vender",
            value: s.physical - s.reserved,
          },
          {
            label: "Pagos iniciales de apartados activos",
            value: formatMoney(s.advances),
          },
        ].map((row) => (
          <div key={row.label}>
            <dt className="text-xs leading-5 text-arma-muted">{row.label}</dt>
            <dd className="mt-2 break-words text-lg font-semibold tabular-nums">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
