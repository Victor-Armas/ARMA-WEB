import { ArrowUpRight, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useAppAccess } from "@/features/access/hooks/useAppAccess";
import type { Dashboard } from "../schemas/dashboard.schema";
import {
  fieldClass,
  formatMoney,
} from "@/features/commerce/utils/commerce-format";
function suggestedPrice(
  cost: number | null,
  margin: number | null,
): number | null {
  return cost !== null && margin !== null
    ? Math.ceil((cost / (1 - margin / 100)) * 100) / 100
    : null;
}
function PriceCostDetails({ price }: { price: Dashboard["prices"][number] }) {
  const materials =
    price.cost !== null && price.labor_cost !== null && price.expenses != null
      ? price.cost - price.labor_cost - price.expenses
      : null;
  return (
    <details className="mt-2 text-xs font-normal">
      <summary className="min-h-11 cursor-pointer py-3 text-arma-active">
        Cómo se calcula
      </summary>
      <dl className="space-y-2 leading-5">
        <div>
          <dt className="text-arma-muted">Playera y DTF</dt>
          <dd>{materials === null ? "Pendiente" : formatMoney(materials)}</dd>
        </div>
        <div>
          <dt className="text-arma-muted">Mano de obra</dt>
          <dd>
            {price.labor_cost === null
              ? "Pendiente"
              : formatMoney(price.labor_cost)}
          </dd>
        </div>
        <div>
          <dt className="text-arma-muted">
            Luz, cinta y otros gastos por pieza
          </dt>
          <dd>
            {price.expenses == null ? "Pendiente" : formatMoney(price.expenses)}
          </dd>
        </div>
      </dl>
      <p className="mt-3 leading-5 text-arma-muted">
        Costos de referencia actuales de la receta. El promedio de venta es el
        importe cobrado por pieza, no su costo.
      </p>
    </details>
  );
}
export function PriceAnalysis({ prices }: { prices: Dashboard["prices"] }) {
  const [search, setSearch] = useState("");
  const access = useAppAccess();
  const list = prices.filter((p) =>
    p.label.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className="mt-6 rounded-arma border border-arma-border bg-arma-surface p-4 sm:p-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h2 className="font-arma-heading text-2xl">
            A cuánto vender tus playeras
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-6 text-arma-muted">
            Compara el precio de lista, lo que realmente cobraste en el período
            y el precio sugerido según los materiales, mano de obra, luz, cinta
            y otros gastos de tu receta. La sugerencia no cambia el precio del
            catálogo.
          </p>
        </div>
        {access.can("production.read") ? (
          <Link
            to="/recipes"
            className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-medium text-arma-active underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-arma-active"
          >
            Configurar recetas y margen
            <ArrowUpRight size={16} strokeWidth={1.7} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <label htmlFor="price-search" className="mt-5 block text-sm font-medium">
        Buscar producto para analizar
      </label>
      <div className="relative mt-2 max-w-lg">
        <Search
          size={18}
          strokeWidth={1.7}
          aria-hidden="true"
          className="pointer-events-none absolute top-3.5 left-3 text-arma-muted"
        />
        <input
          id="price-search"
          type="search"
          value={search}
          maxLength={120}
          onChange={(e) => setSearch(e.target.value)}
          className={`${fieldClass} pl-10`}
        />
      </div>
      <p className="mt-3 text-xs text-arma-muted">
        Hasta 100 variantes activas S, M y L. Sugerido = costo total ÷ (1 −
        margen). Incluye los insumos, mano de obra y gastos por pieza de la
        receta. No incluye impuestos ni gastos no registrados.
      </p>
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left text-sm tabular-nums">
          <caption className="sr-only">
            Comparación de precios por variante en pesos mexicanos
          </caption>
          <thead className="bg-arma-green-soft text-arma-green">
            <tr>
              {[
                "Producto",
                "Costo de producción",
                "Margen",
                "Precio sugerido",
                "Precio de lista",
                "Venta real promedio",
              ].map((t) => (
                <th key={t} className="px-3 py-3 font-medium">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const suggested = suggestedPrice(p.cost, p.target_margin);
              return (
                <tr key={p.id} className="border-b border-arma-border">
                  <th className="max-w-60 px-3 py-4 font-medium">
                    {p.label}
                    <PriceCostDetails price={p} />
                  </th>
                  <td className="px-3 py-4">
                    {p.cost === null ? "Faltan costos" : formatMoney(p.cost)}
                  </td>
                  <td className="px-3 py-4">
                    {p.target_margin === null
                      ? "Sin receta"
                      : `${p.target_margin}%`}
                  </td>
                  <td className="px-3 py-4 font-semibold text-arma-green">
                    {suggested === null ? "Pendiente" : formatMoney(suggested)}
                  </td>
                  <td className="px-3 py-4">{formatMoney(p.catalog_price)}</td>
                  <td
                    className={`px-3 py-4 ${p.actual_price !== null && suggested !== null && p.actual_price < suggested ? "font-semibold text-arma-red" : ""}`}
                  >
                    {p.actual_price === null
                      ? "Sin ventas"
                      : formatMoney(p.actual_price)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 divide-y divide-arma-border border-y border-arma-border md:hidden">
        {list.map((p) => {
          const suggested = suggestedPrice(p.cost, p.target_margin);
          return (
            <article key={p.id} className="py-5">
              <h3 className="break-words text-sm font-semibold">{p.label}</h3>
              <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 text-sm tabular-nums">
                <div>
                  <dt className="text-xs text-arma-muted">Precio sugerido</dt>
                  <dd className="mt-1 text-lg font-semibold text-arma-green">
                    {suggested === null ? "Pendiente" : formatMoney(suggested)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-arma-muted">
                    Venta real promedio
                  </dt>
                  <dd
                    className={`mt-1 text-lg font-semibold ${p.actual_price !== null && suggested !== null && p.actual_price < suggested ? "text-arma-red" : ""}`}
                  >
                    {p.actual_price === null
                      ? "Sin ventas"
                      : formatMoney(p.actual_price)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-arma-muted">
                    Costo de producción
                  </dt>
                  <dd className="mt-1">
                    {p.cost === null ? "Faltan costos" : formatMoney(p.cost)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-arma-muted">Precio de lista</dt>
                  <dd className="mt-1">{formatMoney(p.catalog_price)}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-arma-muted">
                {p.target_margin === null
                  ? "Sin receta configurada"
                  : `Margen objetivo: ${p.target_margin}%`}
              </p>
              <PriceCostDetails price={p} />
            </article>
          );
        })}
      </div>
      {!list.length ? (
        <p className="py-5 text-sm text-arma-muted">
          No hay variantes con esta búsqueda.
        </p>
      ) : null}
    </section>
  );
}
