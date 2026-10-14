import type { CommerceOrder } from '../schemas/commerce.schema';
import { OrderLineItems } from './OrderLineItems';
import { formatMoney, formatDateTime, paymentLabels } from '../utils/commerce-format';

export function SaleRecord({order}: {order: CommerceOrder}) {
  const pieces=order.items.reduce((sum,item)=>sum+item.quantity,0);
  return <article className="overflow-hidden rounded-arma border border-arma-border bg-arma-surface">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-arma-border bg-arma-primary-soft/50 px-4 py-4 sm:px-6">
      <div><h2 className="text-lg font-semibold">Venta #{String(order.order_number).padStart(4,'0')}</h2><p className="mt-1 text-xs text-arma-muted">{formatDateTime(order.created_at)}</p></div>
      <p className="text-sm font-medium text-arma-green">{order.source_reservation_id?'Venta de apartado':'Venta directa'}</p>
    </header>
    <div className="px-4 py-5 sm:px-6">
      <dl className="grid gap-4 border-b border-arma-border pb-4 sm:grid-cols-2">
        <div><dt className="text-xs text-arma-muted">Cliente</dt><dd className="mt-1 break-words text-sm font-semibold">{order.customer_name||'Venta de mostrador'}</dd>{order.customer_phone?<dd className="mt-1"><a href={`tel:${order.customer_phone.replace(/[^+0-9]/g,'')}`} className="text-sm text-arma-active underline underline-offset-4">{order.customer_phone}</a></dd>:null}</div>
        <div><dt className="text-xs text-arma-muted">Registrada por</dt><dd className="mt-1 text-sm font-semibold">{order.seller_name}</dd><dd className="mt-1 text-xs text-arma-muted">{pieces} {pieces===1?'pieza':'piezas'} · {order.payment_method?paymentLabels[order.payment_method]:'Sin forma de pago'}</dd></div>
      </dl>
      <OrderLineItems items={order.items} detailed/>
      {order.notes?<div className="border-t border-arma-border py-4"><h3 className="text-xs font-semibold text-arma-muted">Notas de la venta</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm">{order.notes}</p></div>:null}
      <div className="mt-2 grid gap-5 border-t border-arma-border pt-5 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="text-sm">{order.source_reservation_id?<dl className="space-y-2 tabular-nums"><div className="flex flex-wrap justify-between gap-2"><dt className="text-arma-muted">Anticipo aplicado</dt><dd>{formatMoney(order.source_deposit)}</dd></div><div className="flex flex-wrap justify-between gap-2"><dt className="text-arma-muted">Saldo cobrado</dt><dd>{formatMoney(order.total-order.source_deposit)}</dd></div></dl>:<p className="text-arma-muted">Pago completo registrado{order.payment_method?` en ${paymentLabels[order.payment_method].toLowerCase()}`:''}.</p>}</div>
        <div className="sm:min-w-44 sm:border-l sm:border-arma-border sm:pl-6"><p className="text-xs text-arma-muted">Total de la venta</p><p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(order.total)}</p></div>
      </div>
    </div>
  </article>;
}
