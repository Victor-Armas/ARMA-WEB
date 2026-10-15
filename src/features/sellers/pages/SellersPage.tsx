import { useState } from "react";
import { Link } from "react-router";
import { Pagination } from "@/components/ui/Pagination";
import { ProductImage } from "@/features/products/components/ProductImage";
import {
  fieldClass,
  primaryButton,
  secondaryButton,
  formatMoney,
  formatDateTime,
  paymentLabels,
} from "@/features/commerce/utils/commerce-format";
import { useSellerOverview } from "../hooks/useSellerOverview";
import { SellerSummary } from "../components/SellerSummary";
import { SellerOperationModal } from "../components/SellerOperationModal";
import { paymentTermsLabels } from "../schemas/seller.schema";
import type { SellerForm, SellerDelivery } from "../schemas/seller.schema";
export function SellersPage() {
  const [seller, setSeller] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"deliveries" | "payments">("deliveries");
  const [operation, setOperation] = useState<{
    action: SellerForm["action"];
    delivery?: SellerDelivery;
  } | null>(null);
  const query = useSellerOverview(seller, page);
  const data = query.data;
  return (
    <section className="px-5 py-6 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-arma-heading text-4xl tracking-[-0.035em]">
            Vendedores
          </h1>
          <p className="mt-2 max-w-prose text-sm leading-6 text-arma-muted">
            Mercancía entregada, ganancia y pagos a ARMA. Los cobros al cliente
            los recibe el vendedor.
          </p>
        </div>
        {data?.manager ? (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={secondaryButton}
              onClick={() =>
                setOperation({
                  action: data.summary.due < 0 ? "refund" : "payment",
                })
              }
              disabled={data.summary.due === 0}
            >
              {data.summary.due < 0
                ? "Reintegrar saldo"
                : "Registrar pago a ARMA"}
            </button>
            <button
              type="button"
              className={primaryButton}
              onClick={() => setOperation({ action: "deliver" })}
            >
              Entregar mercancía
            </button>
          </div>
        ) : null}
      </header>
      {query.isPending ? (
        <p role="status" className="mt-6 text-sm">
          Cargando cuenta del vendedor…
        </p>
      ) : query.isError || !data ? (
        <div role="alert" className="mt-6">
          <p>No pudimos cargar la cuenta del vendedor.</p>
          <button
            type="button"
            className={`${secondaryButton} mt-3`}
            onClick={() => void query.refetch()}
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          {data.manager ? (
            <div className="mt-6 max-w-md">
              <label
                htmlFor="seller-account"
                className="mb-2 block text-sm font-medium"
              >
                Cuenta del vendedor
              </label>
              <select
                id="seller-account"
                value={data.seller_id}
                onChange={(e) => {
                  setSeller(e.target.value);
                  setPage(1);
                }}
                className={`${fieldClass} w-full`}
              >
                {data.people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.active ? "" : " (inactivo)"}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <p className="mt-4 text-xs leading-5 text-arma-muted">
            Saldo acumulado de todas las entregas. Las ventas anteriores a esta
            modalidad conservan su historial y no generan deudas retroactivas.
          </p>
          <SellerSummary summary={data.summary} />
          <div className="mt-7 flex flex-wrap gap-3 border-b border-arma-border">
            {(
              [
                { code: "deliveries", label: "Mercancía entregada" },
                { code: "payments", label: "Pagos y reintegros" },
              ] as const
            ).map((item) => (
              <button
                type="button"
                key={item.code}
                aria-pressed={tab === item.code}
                onClick={() => {
                  setTab(item.code);
                  setPage(1);
                }}
                className={`min-h-12 border-b-2 px-2 text-sm font-semibold ${tab === item.code ? "border-arma-active text-arma-active" : "border-transparent text-arma-muted"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div aria-busy={query.isFetching} className="mt-5">
            {tab === "deliveries" ? (
              <div className="grid items-start gap-5 xl:grid-cols-2">
                {data.deliveries.length ? (
                  data.deliveries.map((d) => (
                    <article
                      key={d.id}
                      className="rounded-arma border border-arma-border bg-arma-surface p-4 sm:p-5"
                    >
                      <div className="flex gap-4">
                        <Link
                          to={`/products/${d.product_id}?scope=mine`}
                          className="h-28 w-22 shrink-0 overflow-hidden rounded-arma"
                        >
                          <ProductImage
                            src={d.photo_url ?? null}
                            background={d.photo?.background}
                            alt={d.label}
                            className="h-full w-full object-contain"
                          />
                        </Link>
                        <div className="min-w-0">
                          <h2 className="break-words font-semibold">
                            {d.label}
                          </h2>
                          <p className="mt-2 text-xs text-arma-muted">
                            {formatDateTime(d.created_at)}
                          </p>
                          <p className="mt-3 text-sm font-semibold text-arma-info">
                            ARMA: {formatMoney(d.unit_price)} por pieza
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 rounded-arma bg-arma-info-soft p-3 text-arma-info">
                        <p className="text-sm font-semibold">
                          {paymentTermsLabels[d.payment_terms]}
                        </p>
                        <p className="mt-2 text-sm tabular-nums">
                          Total de entrega:{" "}
                          {formatMoney(d.quantity * d.unit_price)}
                        </p>
                        {d.initial_paid > 0 ? (
                          <p className="mt-1 text-xs tabular-nums">
                            Pago registrado al entregar:{" "}
                            {formatMoney(d.initial_paid)}
                          </p>
                        ) : null}
                      </div>
                      <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-arma-border py-4">
                        {[
                          { label: "Entregadas", value: d.quantity },
                          { label: "Disponibles", value: d.available },
                          { label: "Apartadas", value: d.reserved },
                        ].map((row) => (
                          <div key={row.label}>
                            <dt className="text-xs text-arma-muted">
                              {row.label}
                            </dt>
                            <dd className="mt-1 text-lg font-semibold tabular-nums">
                              {row.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      {d.returned > 0 ? (
                        <p className="mt-3 text-xs text-arma-muted">
                          {d.returned} piezas regresadas al taller.
                        </p>
                      ) : null}
                      {d.notes ? (
                        <p className="mt-3 break-words text-sm text-arma-muted">
                          {d.notes}
                        </p>
                      ) : null}
                      {data.manager && d.available > 0 ? (
                        <button
                          type="button"
                          className={`${secondaryButton} mt-4`}
                          onClick={() =>
                            setOperation({ action: "return", delivery: d })
                          }
                        >
                          Regresar piezas al taller
                        </button>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <p className="py-6 text-sm text-arma-muted">
                    Todavía no hay entregas para esta cuenta.
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-arma-border rounded-arma border border-arma-border bg-arma-surface">
                {data.payments.length ? (
                  data.payments.map((p) => (
                    <article
                      key={p.id}
                      className="flex flex-wrap justify-between gap-4 p-5"
                    >
                      <div>
                        <h2 className="text-sm font-semibold">
                          {p.direction === "payment"
                            ? "Pago recibido por ARMA"
                            : "Reintegro al vendedor"}
                        </h2>
                        <p className="mt-2 text-xs text-arma-muted">
                          {formatDateTime(p.created_at)} ·{" "}
                          {paymentLabels[p.method]}
                        </p>
                        {p.reference ? (
                          <p className="mt-2 break-words text-sm">
                            {p.reference}
                          </p>
                        ) : null}
                      </div>
                      <p
                        className={`text-xl font-semibold tabular-nums ${p.direction === "payment" ? "text-arma-green" : "text-arma-info"}`}
                      >
                        {formatMoney(p.amount)}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="p-6 text-sm text-arma-muted">
                    Todavía no hay pagos en esta página.
                  </p>
                )}
              </div>
            )}
          </div>
          <Pagination
            page={page}
            totalPages={Math.max(
              1,
              Math.ceil(
                (tab === "deliveries" ? data.total : data.payments_total) / 12,
              ),
            )}
            disabled={query.isFetching}
            onPageChange={setPage}
            ariaLabel="Páginas de la cuenta del vendedor"
          />
          {operation ? (
            <SellerOperationModal
              action={operation.action}
              seller={data.seller_id}
              delivery={operation.delivery}
              onClose={() => setOperation(null)}
            />
          ) : null}
        </>
      )}
    </section>
  );
}
