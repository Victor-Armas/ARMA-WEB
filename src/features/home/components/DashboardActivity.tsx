import { ArrowUpRight, Check, ShoppingBag, TriangleAlert } from "lucide-react";
import { Link } from "react-router";
import type { Dashboard } from "../schemas/dashboard.schema";
import {
  formatMoney,
  formatDateTime,
} from "@/features/commerce/utils/commerce-format";
const statusLabels: Record<string, string> = {
  active: "Activo",
  completed: "Venta",
  fulfilled: "Pagado",
  cancelled: "Cancelado",
};
export function DashboardActivity({ data }: { data: Dashboard }) {
  const maxRevenue = Math.max(...data.top_products.map((p) => p.revenue), 1);
  return (
    <>
      <div className="mt-6 grid items-start gap-5 xl:grid-cols-2">
        <section className="min-w-0 rounded-arma border border-arma-border bg-arma-surface p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-arma-heading text-2xl">
              {data.mode === "business"
                ? "Productos con más ventas"
                : "Tus productos más vendidos"}
            </h2>
            <ShoppingBag
              size={21}
              strokeWidth={1.6}
              className="shrink-0 text-arma-green"
              aria-hidden="true"
            />
          </div>
          <p className="mt-2 text-xs text-arma-muted">
            Valor de ventas registradas en el período, antes de devoluciones.
          </p>
          <div className="mt-4 divide-y divide-arma-border">
            {!data.top_products.length ? (
              <p className="py-6 text-sm text-arma-muted">
                No hay ventas en este período.
              </p>
            ) : (
              data.top_products.map((p, index) => (
                <div key={p.name + index} className="py-4">
                  <div className="flex items-start justify-between gap-4 text-sm">
                    <div className="min-w-0">
                      <p className="break-words font-semibold">{p.name}</p>
                      <p className="mt-1 text-xs text-arma-muted">
                        {p.pieces} piezas
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold text-arma-green tabular-nums">
                      {formatMoney(p.revenue)}
                    </p>
                  </div>
                  <meter
                    min={0}
                    max={maxRevenue}
                    value={p.revenue}
                    aria-label={`Ventas de ${p.name}: ${formatMoney(p.revenue)}`}
                    className="sr-only"
                  />
                  <div
                    aria-hidden="true"
                    className="mt-3 h-1 overflow-hidden rounded-arma bg-arma-green-soft"
                  >
                    <div
                      className="h-full rounded-arma bg-arma-green"
                      style={{
                        width: `${Math.min(100, (p.revenue / maxRevenue) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
        <section className="min-w-0 rounded-arma border border-arma-border bg-arma-surface p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-arma-heading text-2xl">Stock para revisar</h2>
            {data.stock_alerts.length ? (
              <span className="shrink-0 rounded-arma bg-arma-warning-soft px-2 py-1 text-xs font-semibold text-arma-warning">
                {data.stock_alerts.length} por revisar
              </span>
            ) : (
              <Check
                size={21}
                strokeWidth={1.6}
                className="text-arma-green"
                aria-hidden="true"
              />
            )}
          </div>
          <p className="mt-2 text-xs leading-5 text-arma-muted">
            {data.mode === "business"
              ? "Existencias actuales del taller que puedes consultar."
              : "Existencias de tu mercancía asignada. Consulta las entregas y liquidaciones en Vendedores."}
          </p>
          <div className="mt-4 divide-y divide-arma-border">
            {!data.stock_alerts.length ? (
              <p className="py-6 text-sm text-arma-green">
                Sin alertas de stock en este momento.
              </p>
            ) : (
              data.stock_alerts.map((s, i) => (
                <Link
                  key={s.label + i}
                  to={s.kind === "material" ? "/materials" : "/products"}
                  className="flex items-start gap-3 py-4 text-sm no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active"
                >
                  <TriangleAlert
                    size={18}
                    strokeWidth={1.7}
                    aria-hidden="true"
                    className={`mt-0.5 shrink-0 ${s.available <= 3 ? "text-arma-red" : "text-arma-warning"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium">{s.label}</p>
                    <p className="mt-1 text-xs text-arma-muted">
                      {s.kind === "material"
                        ? "Materia prima"
                        : "Producto terminado"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-arma px-2 py-1 text-xs font-semibold tabular-nums ${s.available <= 3 ? "bg-arma-red-soft text-arma-red" : "bg-arma-warning-soft text-arma-warning"}`}
                  >
                    {s.available} disponibles
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
      <section className="mt-6 rounded-arma border border-arma-border bg-arma-surface p-4 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-arma-heading text-2xl">Actividad reciente</h2>
          <p className="text-xs text-arma-muted">
            Últimos registros de todos los períodos visibles para tu cuenta.
          </p>
        </div>
        <div className="mt-4 divide-y divide-arma-border">
          {!data.recent.length ? (
            <p className="py-6 text-sm text-arma-muted">
              Aún no hay movimientos.
            </p>
          ) : (
            data.recent.map((o) => (
              <Link
                key={o.id}
                to={o.kind === "sale" ? "/sales" : "/reservations"}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4 text-sm no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active"
              >
                <span
                  className={`min-w-22 rounded-arma px-2 py-1 text-center text-xs font-medium ${o.status === "cancelled" ? "bg-arma-red-soft text-arma-red" : o.kind === "sale" || o.status === "fulfilled" ? "bg-arma-green-soft text-arma-green" : "bg-arma-gold-soft text-arma-gold"}`}
                >
                  {statusLabels[o.status] ?? o.kind}
                </span>
                <div className="min-w-0 flex-1 basis-36">
                  <p className="break-words font-semibold">
                    {o.kind === "sale" ? "Venta" : "Apartado"} #
                    {String(o.order_number).padStart(4, "0")} ·{" "}
                    {o.customer_name || "Mostrador"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-arma-muted">
                    {formatDateTime(o.created_at)} · {o.seller_name}
                  </p>
                </div>
                <p className="ml-auto font-semibold tabular-nums">
                  {formatMoney(o.total)}
                </p>
                <ArrowUpRight
                  size={17}
                  strokeWidth={1.6}
                  className="text-arma-muted"
                  aria-hidden="true"
                />
              </Link>
            ))
          )}
        </div>
      </section>
    </>
  );
}
