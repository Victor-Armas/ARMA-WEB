import { useState } from 'react';
import { Link } from 'react-router';
import { Search } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useCommerceOrders, useCommercePermissions } from '../hooks/useCommerce';
import type { OrderKind, SalesPeriod } from '../schemas/commerce.schema';
import { ReservationRecord } from '../components/ReservationRecord';
import { SaleRecord } from '../components/SaleRecord';
import { SalesSummary } from '../components/SalesSummary';
import { DeliverySchedule } from '../components/DeliverySchedule';
import { fieldClass, primaryButton, secondaryButton, formatCalendarDate } from '../utils/commerce-format';

export function CommercePage({kind}: {kind: OrderKind}) {
  const [page,setPage]=useState(1);
  const [search,setSearch]=useState('');
  const [status,setStatus]=useState('');
  const [delivery,setDelivery]=useState('');
  const [period,setPeriod]=useState<SalesPeriod>('all');
  const debounced=useDebouncedValue(search.trim());
  const permissions=useCommercePermissions();
  const orders=useCommerceOrders(kind,page,debounced,status,permissions.data?.read===true,delivery,period);
  const total=orders.data?.total??0;
  const currentPage=orders.data?.page??page;
  const updating=orders.isFetching||orders.isPlaceholderData||debounced!==search.trim();
  function selectDelivery(date:string){setDelivery(date);setPage(1);}
  return <section className="px-5 py-6 sm:px-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-arma-heading text-4xl tracking-[-0.035em]">{kind==='sale'?'Ventas':'Apartados'}</h1>
        <p className="mt-2 text-sm text-arma-muted">{kind==='sale'?'Tus productos vendidos, sus importes y cómo se cobraron':'Seguimiento de clientes, pagos y compromisos de entrega'}</p>
      </div>
      {permissions.data?.write?<Link to={`/products?action=${kind}`} className={`${primaryButton} inline-flex items-center justify-center no-underline`}>{kind==='sale'?'Registrar venta':'Crear apartado'}</Link>:null}
    </header>
    {permissions.isPending?<p role="status" className="mt-8 text-sm text-arma-muted">Cargando permisos…</p>:permissions.isError?<div role="alert" className="mt-8"><p>No pudimos verificar tus permisos.</p><button type="button" onClick={()=>void permissions.refetch()} className={`${secondaryButton} mt-3`}>Reintentar</button></div>:!permissions.data?.read?<p role="alert" className="mt-8 text-sm">Tu cuenta no tiene permiso para consultar este apartado.</p>:<>
      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div className="w-full min-w-0 sm:w-auto sm:min-w-64 sm:flex-1 sm:max-w-xl">
          <label htmlFor={`search-${kind}`} className="mb-2 block text-sm font-medium">Buscar por cliente, teléfono, producto o folio</label>
          <div className="flex items-center gap-3 rounded-arma border border-arma-border bg-arma-surface px-3 focus-within:ring-2 focus-within:ring-arma-active">
            <Search size={18} aria-hidden="true" className="shrink-0 text-arma-icon"/>
            <input id={`search-${kind}`} type="search" maxLength={120} value={search} onChange={event=>{setSearch(event.target.value);setPage(1);setDelivery('');}} className="min-h-11 min-w-0 flex-1 bg-transparent text-base outline-none"/>
          </div>
        </div>
        {kind==='reservation'?<>
          <div><label htmlFor="reservation-status" className="mb-2 block text-sm font-medium">Estado</label><select id="reservation-status" value={status} onChange={event=>{setStatus(event.target.value);setPage(1);setDelivery('');}} className={fieldClass}><option value="">Todos</option><option value="active">Activos</option><option value="fulfilled">Pagados</option><option value="cancelled">Cancelados</option></select></div>
          <div className="min-w-0"><label htmlFor="delivery-filter" className="mb-2 block text-sm font-medium">Fecha de entrega</label><input id="delivery-filter" type="date" value={/^\d{4}-\d{2}-\d{2}$/.test(delivery)?delivery:''} onChange={event=>selectDelivery(event.target.value)} className={fieldClass}/></div>
        </>:<div><label htmlFor="sales-period" className="mb-2 block text-sm font-medium">Período</label><select id="sales-period" value={period} onChange={event=>{const value=event.target.value;if(value==='all'||value==='today'||value==='week'||value==='month'){setPeriod(value);setPage(1);}}} className={fieldClass}><option value="all">Todas las ventas</option><option value="today">Hoy</option><option value="week">Esta semana</option><option value="month">Últimos 30 días</option></select></div>}
      </div>
      {!orders.isError&&orders.data?<div aria-busy={updating}>{kind==='sale'?<SalesSummary summary={orders.data.sales_summary}/>:<DeliverySchedule summary={orders.data.delivery_summary} selected={delivery} onSelect={selectDelivery}/>}</div>:null}
      <div className="mt-6 flex min-h-5 flex-wrap justify-between gap-3 text-sm text-arma-muted">
        <p>{total} {kind==='sale'?(total===1?'venta':'ventas'):(total===1?'apartado':'apartados')}{delivery?` · ${delivery==='overdue'?'entregas atrasadas':delivery==='unscheduled'?'sin fecha':formatCalendarDate(delivery)}`:''}</p>
        <p role="status">{updating?'Actualizando…':''}</p>
      </div>
      {orders.isError?<div role="alert" className="mt-5"><p className="text-sm text-arma-red">No pudimos cargar los registros.</p><button type="button" onClick={()=>void orders.refetch()} className={`${secondaryButton} mt-3`}>Reintentar</button></div>:orders.isPending?<p role="status" className="mt-8 text-sm text-arma-muted">Cargando registros…</p>:orders.data?.items.length===0?<div className="mt-6 border-y border-arma-border py-10">
        <h2 className="text-lg font-semibold">{search||status||delivery||period!=='all'?'No encontramos registros con estos filtros':kind==='sale'?'Todavía no hay ventas registradas':'Todavía no hay apartados'}</h2>
        <p className="mt-2 text-sm text-arma-muted">{search||status||delivery||period!=='all'?'Prueba otra búsqueda o cambia los filtros.':'Selecciona un producto y su talla para registrar la primera operación.'}</p>
      </div>:<div aria-busy={updating} className="mt-4 space-y-5">{orders.data?.items.map(order=>kind==='sale'?<SaleRecord key={order.id} order={order}/>:<ReservationRecord key={order.id} order={order} canWrite={permissions.data?.write===true}/>)}</div>}
      {!orders.isPending&&!orders.isError?<Pagination page={currentPage} totalPages={Math.max(1,Math.ceil(total/12))} disabled={updating} ariaLabel={kind==='sale'?'Páginas de ventas':'Páginas de apartados'} onPageChange={next=>{setPage(next);window.scrollTo({top:0,behavior:'auto'});}}/>:null}
    </>}
  </section>;
}
