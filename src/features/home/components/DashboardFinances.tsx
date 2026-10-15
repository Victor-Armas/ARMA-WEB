import { Calculator, TriangleAlert } from "lucide-react";
import { formatMoney } from "@/features/commerce/utils/commerce-format";
import type { Dashboard } from "../schemas/dashboard.schema";
export function DashboardFinances({ data }: { data: Dashboard }) {
  return (
    <section className="mt-6 rounded-arma border border-arma-green/20 bg-arma-green-soft p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Calculator
          size={22}
          strokeWidth={1.6}
          aria-hidden="true"
          className="text-arma-green"
        />
        <h2 className="font-arma-heading text-2xl text-arma-green">
          Costos y margen de ventas al cliente
        </h2>
      </div>
      <dl className="mt-5 grid gap-5 sm:grid-cols-3 sm:divide-x sm:divide-arma-green/20 sm:gap-0">
        {[
          {
            label: "Compras de materia prima",
            value: data.material_purchases,
            detail:
              "Importe de entradas del período. No equivale a una salida de caja registrada.",
          },
          {
            label: "Costo de piezas vendidas",
            value: data.known_cost,
            detail: "Solo piezas con costo guardado al vender.",
          },
          {
            label: "Margen de ventas al cliente",
            value: data.known_gross_margin,
            detail:
              "Antes de devoluciones e impuestos. Incluye el margen del revendedor; no es la ganancia de ARMA.",
          },
        ].map((m, i) => (
          <div
            key={m.label}
            className="min-w-0 sm:px-5 sm:first:pl-0 sm:last:pr-0"
          >
            <dt className="text-sm text-arma-green">{m.label}</dt>
            <dd
              className={`mt-2 break-words text-2xl font-semibold tabular-nums ${i === 2 ? "text-arma-green" : ""}`}
            >
              {formatMoney(m.value ?? 0)}
            </dd>
            <dd className="mt-2 max-w-prose text-xs leading-5 text-arma-green">
              {m.detail}
            </dd>
          </div>
        ))}
      </dl>
      {(data.unknown_cost_pieces ?? 0) > 0 ? (
        <div className="mt-5 flex items-start gap-3 rounded-arma bg-arma-warning-soft p-3 text-arma-warning">
          <TriangleAlert
            size={19}
            strokeWidth={1.7}
            aria-hidden="true"
            className="mt-0.5 shrink-0"
          />
          <p className="text-sm leading-6">
            Falta el costo histórico de {data.unknown_cost_pieces} piezas
            vendidas. El margen mostrado es parcial; no asignamos un costo
            inventado a ventas anteriores.
          </p>
        </div>
      ) : null}
      <p className="mt-4 border-t border-arma-green/20 pt-4 text-xs leading-5 text-arma-green">
        Ventas menos reembolsos de ventas en este período:{" "}
        <strong className="tabular-nums">
          {formatMoney(data.sales - data.sales_refunds)}
        </strong>
        . Los reembolsos pueden corresponder a ventas de otro período.
      </p>
    </section>
  );
}
