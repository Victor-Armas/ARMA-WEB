import { Calculator, TriangleAlert } from "lucide-react";
import { formatMoney } from "@/features/commerce/utils/commerce-format";
import type { Dashboard } from "../schemas/dashboard.schema";
export function DashboardFinances({ data }: { data: Dashboard }) {
  const company = data.company;
  if (!company) return null;
  const metrics = [
    {
      label: "Venta que corresponde a ARMA",
      value: company.revenue,
      detail:
        "Venta directa, consignación vendida y compras de vendedores, menos sus devoluciones. Una reventa no se suma dos veces.",
    },
    {
      label: "Costo histórico conocido",
      value: company.known_cost,
      detail:
        "Costo de las piezas que generaron la venta de ARMA. Las devoluciones vendibles revierten su costo.",
    },
    {
      label: "Entradas de materia prima",
      value: data.material_purchases ?? 0,
      detail:
        "Valor de materiales recibidos en el período. No equivale a una salida de caja conciliada.",
    },
  ];
  return (
    <section className="mt-6 rounded-arma border border-arma-border bg-arma-surface p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Calculator
          size={22}
          strokeWidth={1.6}
          className="text-arma-green"
          aria-hidden="true"
        />
        <h2 className="font-arma-heading text-2xl">Costos del negocio</h2>
      </div>
      <dl className="mt-5 grid gap-5 sm:grid-cols-3 sm:divide-x sm:divide-arma-border sm:gap-0">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="min-w-0 sm:px-5 sm:first:pl-0 sm:last:pr-0"
          >
            <dt className="text-sm text-arma-neutral">{m.label}</dt>
            <dd className="mt-2 break-words text-2xl font-semibold tabular-nums">
              {formatMoney(m.value)}
            </dd>
            <dd className="mt-2 text-xs leading-5 text-arma-neutral">
              {m.detail}
            </dd>
          </div>
        ))}
      </dl>
      {company.unknown_cost_pieces > 0 ? (
        <p className="mt-5 flex items-start gap-2 rounded-arma bg-arma-warning-soft p-3 text-sm leading-6 text-arma-warning">
          <TriangleAlert
            size={18}
            className="mt-1 shrink-0"
            aria-hidden="true"
          />
          Falta costo histórico en movimientos de {company.unknown_cost_pieces}{" "}
          piezas. El margen de ARMA es parcial.
        </p>
      ) : null}
      <p className="mt-5 border-t border-arma-border pt-4 text-xs leading-5 text-arma-neutral">
        El margen de ARMA usa sus importes pactados con vendedores, no el precio
        final de reventa. Control operativo: antes de impuestos y gastos no
        registrados; sin desglose de IVA ni emisión de CFDI.
      </p>
    </section>
  );
}
