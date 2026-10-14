import { Link } from 'react-router';
import { CalendarDays } from 'lucide-react';
import type { CommerceOrder } from '../schemas/commerce.schema';
import { formatMoney, formatDate, formatCalendarDate, paymentLabels, todayInMonterrey } from '../utils/commerce-format';
import { ReservationAction } from './ReservationAction';
import { OrderLineItems } from './OrderLineItems';
import { DeliveryConfirmation } from './DeliveryConfirmation';
import { DeliveryDateEditor } from './DeliveryDateEditor';

const statusLabels={active:'Activo',cancelled:'Cancelado',fulfilled:'Pagado',completed:'Venta registrada'};
export function ReservationRecord({order,canWrite}: {order: CommerceOrder;canWrite:boolean}) {
  const today=todayInMonterrey();
  const pendingDelivery=(order.status==='active'||order.status==='fulfilled')&&!order.delivered_at;
  const deliveryLate=pendingDelivery&&order.delivery_date!==null&&order.delivery_date<today;
  const paymentLate=order.status==='active'&&order.due_date!==null&&order.due_date<today;
  return <article className="rounded-arma border border-arma-border bg-arma-surface px-4 py-5 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Apartado #{String(order.order_number).padStart(4,'0')}</h2>
      <span className={`rounded-arma px-2 py-1 text-xs font-medium ${deliveryLate?'bg-arma-red-soft text-arma-red':order.status==='active'?'bg-arma-warning-soft text-arma-warning':'bg-arma-neutral-soft text-arma-neutral'}`}>{order.delivered_at?'Entregado':deliveryLate?'Entrega atrasada':statusLabels[order.status]}</span>
    </div>
    <p className="mt-2 text-xs text-arma-muted">{formatDate(order.created_at)} · {order.seller_name}</p>
    <p className="mt-4 break-words text-sm font-semibold">{order.customer_name}</p>
    {order.customer_phone?<a href={`tel:${order.customer_phone.replace(/[^+0-9]/g,'')}`} className="mt-1 inline-block text-sm text-arma-active underline underline-offset-4">{order.customer_phone}</a>:null}
    <div className="mt-2"><OrderLineItems items={order.items}/></div>
    <div className="border-y border-arma-border py-4">
      <p className="flex items-center gap-2 text-xs font-medium text-arma-muted"><CalendarDays size={17} aria-hidden="true"/>Compromiso de entrega</p>
      <p className={`mt-2 text-base font-semibold ${deliveryLate?'text-arma-red':''}`}>{order.delivery_date?formatCalendarDate(order.delivery_date):'Sin fecha programada'}</p>
      {pendingDelivery&&canWrite?<DeliveryDateEditor id={order.id} date={order.delivery_date}/>:null}
    </div>
    <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 tabular-nums">
      <div><dt className="text-xs text-arma-muted">Total</dt><dd className="mt-1 text-lg font-semibold">{formatMoney(order.total)}</dd></div>
      <div><dt className="text-xs text-arma-muted">Anticipo</dt><dd className="mt-1 font-medium">{formatMoney(order.deposit)}</dd></div>
      <div><dt className="text-xs text-arma-muted">{order.status==='cancelled'?'Devuelto':order.status==='fulfilled'?'Saldo cobrado':'Saldo pendiente'}</dt><dd className="mt-1 font-medium">{formatMoney(order.status==='cancelled'?order.refunded_amount:order.total-order.deposit)}</dd></div>
    </dl>
    {order.payment_method?<p className="mt-3 text-xs text-arma-muted">Anticipo: {paymentLabels[order.payment_method]}</p>:null}
    {order.due_date?<p className={`mt-2 text-xs ${paymentLate?'text-arma-red':'text-arma-muted'}`}>Fecha límite de pago: {formatCalendarDate(order.due_date)}{paymentLate?' · Pendiente de revisión':''}</p>:null}
    {order.notes?<p className="mt-3 whitespace-pre-wrap break-words text-sm text-arma-muted">{order.notes}</p>:null}
    {order.sale_id?<Link to="/sales" className="mt-3 inline-block text-sm text-arma-active underline underline-offset-4">Consultar venta</Link>:null}
    {order.delivered_at?<p className="mt-3 text-sm font-medium text-arma-green">Entrega confirmada el {formatDate(order.delivered_at)}</p>:order.status==='fulfilled'&&canWrite?<DeliveryConfirmation id={order.id}/>:null}
    {order.status==='active'&&canWrite?<ReservationAction order={order}/>:null}
  </article>;
}
