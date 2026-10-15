import { Landmark, TriangleAlert } from "lucide-react";
import {
  formatMoney,
  paymentLabels,
} from "@/features/commerce/utils/commerce-format";
import type { Dashboard } from "../schemas/dashboard.schema";
export function CompanyFinances({
  data,
}: {
  data: NonNullable<Dashboard["company"]>;
}) {
  const metrics = [
    {
      label: "Venta atribuible a ARMA",
      value: data.revenue,
      detail:
        "Venta del taller + importe pactado en consignación + compras de vendedores. Descontadas sus devoluciones.",
    },
    {
      label: "Cobros recibidos por ARMA",
      value: data.received,
      detail:
        "Pagos al taller y liquidaciones de vendedores. No incluye dinero que el vendedor aún conserva.",
    },
    {
      label: "Cobros netos de ARMA",
      value: data.net_receipts,
      detail: `${formatMoney(data.refunded)} reembolsados. Es flujo recibido, no ganancia ni saldo bancario conciliado.`,
    },
    {
      label: "Margen bruto conocido de ARMA",
      value: data.known_margin,
      detail: `${formatMoney(data.known_cost)} de costo histórico conocido. Antes de impuestos y gastos no incluidos en las recetas.`,
    },
  ];
  return (
    <section
      aria-labelledby="company-finances-title"
      className="mt-6 rounded-arma border border-arma-info/25 bg-arma-info-soft p-4 sm:p-6"
    >
      <div className="flex items-center gap-3 text-arma-info">
        <Landmark size={23} strokeWidth={1.6} aria-hidden="true" />
        <h2 id="company-finances-title" className="font-arma-heading text-2xl">
          Lo que corresponde a ARMA
        </h2>
      </div>
      <p className="mt-2 max-w-prose text-sm leading-6 text-arma-info">
        La reventa del vendedor y el dinero de ARMA se calculan por separado.
        Una compra pagada o a crédito se cuenta al entregar mercancía; su
        reventa no se suma otra vez.
      </p>
      <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="min-w-0 border-t border-arma-info/20 pt-4"
          >
            <dt className="text-sm text-arma-info">{m.label}</dt>
            <dd className="mt-2 break-words text-2xl font-semibold tabular-nums text-arma-info">
              {formatMoney(m.value)}
            </dd>
            <dd className="mt-2 text-xs leading-5 text-arma-info">
              {m.detail}
            </dd>
          </div>
        ))}
      </dl>
      {data.unknown_cost_pieces > 0 ? (
        <p className="mt-4 flex items-start gap-2 rounded-arma bg-arma-warning-soft p-3 text-sm leading-6 text-arma-warning">
          <TriangleAlert
            size={18}
            className="mt-1 shrink-0"
            aria-hidden="true"
          />
          Falta costo histórico en movimientos de {data.unknown_cost_pieces}{" "}
          piezas. El margen es parcial; esas operaciones no aportan un margen
          estimado.
        </p>
      ) : null}
      <div className="mt-5 grid gap-4 border-t border-arma-info/20 pt-4 sm:grid-cols-3">
        {(["cash", "transfer", "card"] as const).map((method) => {
          const p = data.payments.find((row) => row.method === method);
          return (
            <div key={method} className="text-arma-info">
              <h3 className="text-sm font-medium">{paymentLabels[method]}</h3>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {formatMoney(p?.net ?? 0)} netos
              </p>
              <p className="mt-1 text-xs leading-5">
                {formatMoney(p?.received ?? 0)} recibidos ·{" "}
                {formatMoney(p?.refunded ?? 0)} reembolsados
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-5 border-t border-arma-info/20 pt-4 text-xs leading-5 text-arma-info">
        Control operativo en MXN. Configuración fiscal pendiente: sin desglose
        de IVA ni emisión de CFDI. Estos importes no constituyen una declaración
        fiscal ni una utilidad neta validada.
      </p>
    </section>
  );
}
