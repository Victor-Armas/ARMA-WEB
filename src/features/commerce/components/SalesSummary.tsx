import type { SalesSummaryData } from '../schemas/commerce.schema';
import { formatMoney, paymentLabels } from '../utils/commerce-format';

export function SalesSummary({summary}: {summary: SalesSummaryData}) {
  const collected=summary.revenue-summary.applied_deposits;
  return <section aria-label="Resumen de ventas del período y búsqueda seleccionados" className="mt-7 grid gap-6 border-y border-arma-border py-6 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
    <div>
      <h2 className="text-sm font-medium text-arma-muted">Valor de las ventas</h2>
      <p className="mt-2 font-arma-heading text-4xl tracking-[-0.03em] tabular-nums sm:text-5xl">{formatMoney(summary.revenue)}</p>
      <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-4">
        <div><dt className="text-xs text-arma-muted">Ventas registradas</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{summary.orders}</dd></div>
        <div><dt className="text-xs text-arma-muted">Piezas vendidas</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{summary.pieces}</dd></div>
        <div><dt className="text-xs text-arma-muted">Promedio por venta</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{formatMoney(summary.average_ticket)}</dd></div>
      </dl>
      {summary.discounts>0?<p className="mt-4 text-xs text-arma-muted">Descuentos frente al precio de catálogo: {formatMoney(summary.discounts)}</p>:null}
    </div>
    <div className="border-t border-arma-border pt-5 xl:border-t-0 xl:border-l xl:pl-6 xl:pt-0">
      <h2 className="text-sm font-semibold">Cobrado al registrar o cerrar la venta</h2>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{formatMoney(collected)}</p>
      <p className="mt-1 text-xs text-arma-muted">Anticipos recibidos anteriormente: {formatMoney(summary.applied_deposits)}</p>
      <dl className="mt-4 space-y-3">{summary.payments.filter(payment=>payment.method!==null).map(payment=><div key={payment.method} className="flex justify-between gap-3 text-sm"><dt className="text-arma-muted">{payment.method?paymentLabels[payment.method]:''}</dt><dd className="font-medium tabular-nums">{formatMoney(payment.amount)}</dd></div>)}</dl>
    </div>
  </section>;
}
