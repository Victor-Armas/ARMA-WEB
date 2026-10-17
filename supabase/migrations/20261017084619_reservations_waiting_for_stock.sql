-- A waiting reservation records demand and receipts without manufacturing stock.
alter table public.commerce_orders
 add column stock_status text not null default 'reserved' check(stock_status in ('waiting','reserved')),
 add column stock_source text not null default 'warehouse' check(stock_source in ('warehouse','seller')),
 add column stock_assigned_at timestamptz,
 add constraint waiting_reservation_only check(stock_status<>'waiting' or (kind='reservation' and status in ('active','cancelled') and delivered_at is null));
update public.commerce_orders o set stock_source='seller' where exists(select 1 from arma_private.seller_order_links l where l.order_id=o.id);
alter table public.commerce_order_items alter column inventory_balance_id drop not null;
create function arma_private.check_reservation_stock_item() returns trigger language plpgsql set search_path='' as $$
begin
 if new.inventory_balance_id is null and not exists(select 1 from public.commerce_orders o where o.id=new.order_id and o.kind='reservation' and o.stock_status='waiting') then
  raise exception 'Solo un apartado pendiente de existencia puede carecer de inventario.';
 end if;
 return new;
end;$$;
revoke all on function arma_private.check_reservation_stock_item() from public,anon,authenticated;
create trigger reservation_item_stock_guard before insert or update of inventory_balance_id,order_id on public.commerce_order_items for each row execute function arma_private.check_reservation_stock_item();
create function arma_private.check_reservation_stock_order() returns trigger language plpgsql set search_path='' as $$
begin
 if new.stock_status='reserved' and exists(select 1 from public.commerce_order_items i where i.order_id=new.id and i.inventory_balance_id is null) then raise exception 'Primero asigna existencia a todas las piezas.';end if;
 return new;
end;$$;
revoke all on function arma_private.check_reservation_stock_order() from public,anon,authenticated;
create trigger reservation_order_stock_guard before update of stock_status on public.commerce_orders for each row execute function arma_private.check_reservation_stock_order();
create index commerce_waiting_stock on public.commerce_orders(created_by,delivery_date,id) where kind='reservation' and status='active' and stock_status='waiting';


CREATE OR REPLACE FUNCTION arma_private.create_commerce_order(p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_actor uuid:=auth.uid(); v_id uuid; v_kind text; v_quantity integer; v_price numeric; v_deposit numeric;
 v_name text; v_phone text; v_notes text; v_method text; v_date date; v_delivery date; v_variant public.product_variants; v_balance public.inventory_balances;
 v_lot arma_private.seller_deliveries;v_delivery_id uuid;v_product public.products; v_existing public.commerce_orders; v_seller text;
begin
 if v_actor is null or not public.has_commerce_permission(case when p_payload->>'kind'='sale' then 'sales.create' else 'reservations.create' end) then raise exception 'Tu cuenta no tiene permiso para registrar ventas o apartados.' using errcode='42501'; end if;
 v_id:=(p_payload->>'request_id')::uuid;
 if v_id is null then raise exception 'Falta el identificador de la operación.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 select * into v_existing from public.commerce_orders where id=v_id;
 if found then
  if v_existing.created_by<>v_actor then raise exception 'Operación no disponible.' using errcode='42501'; end if;
  return v_existing.id;
 end if;
 v_kind:=p_payload->>'kind'; v_quantity:=(p_payload->>'quantity')::integer;
 v_price:=(p_payload->>'unit_price')::numeric; v_deposit:=coalesce((p_payload->>'deposit')::numeric,0);
 v_name:=trim(coalesce(p_payload->>'customer_name','')); v_phone:=trim(coalesce(p_payload->>'customer_phone','')); v_notes:=trim(coalesce(p_payload->>'notes',''));
 v_method:=nullif(p_payload->>'payment_method',''); v_date:=nullif(p_payload->>'due_date','')::date; v_delivery:=nullif(p_payload->>'delivery_date','')::date;
 if v_kind is null or v_kind not in ('sale','reservation') or v_quantity is null or v_quantity not between 1 and 10000 then raise exception 'Cantidad o tipo de operación inválidos.'; end if;
 if v_price is null or v_price::text in ('NaN','Infinity','-Infinity') or v_price<=0 or v_price>999999 or v_price<>round(v_price,2) or v_deposit::text in ('NaN','Infinity','-Infinity') or v_deposit<>round(v_deposit,2) or v_deposit<0 or v_deposit>v_price*v_quantity then raise exception 'Revisa el precio y el anticipo.'; end if;
 if length(v_name)>120 or length(v_phone)>30 or length(v_notes)>1000 then raise exception 'El nombre, teléfono o las notas son demasiado largos.'; end if;
 if v_kind='reservation' and v_name='' then raise exception 'Escribe el nombre del cliente del apartado.'; end if;
 if v_method is not null and v_method not in ('cash','transfer','card') then raise exception 'Forma de pago inválida.'; end if;
 if (v_kind='sale' or v_deposit>0) and v_method is null then raise exception 'Selecciona la forma de pago.'; end if;
 if v_kind='sale' and (v_deposit<>0 or v_date is not null or v_delivery is not null) then raise exception 'Una venta no necesita anticipo ni fecha límite.'; end if;
 if v_date is not null and v_date<(now() at time zone 'America/Monterrey')::date then raise exception 'La fecha límite no puede estar en el pasado.'; end if;
 if v_delivery is not null and v_delivery<(now() at time zone 'America/Monterrey')::date then raise exception 'La fecha de entrega no puede estar en el pasado.'; end if;
 select pv.* into v_variant from public.product_variants pv where pv.id=(p_payload->>'variant_id')::uuid and pv.is_active for share;
 if not found or v_variant.currency<>'MXN' or upper(trim(v_variant.size)) not in ('S','M','L') then raise exception 'Esta variante no está disponible para venta.'; end if;
 select * into v_product from public.products where id=v_variant.product_id and is_active for share;
 if not found then raise exception 'El producto ya no está activo.'; end if;
 -- Waiting requests intentionally have no balance, movement or seller-delivery agreement yet.
 if coalesce(p_payload->>'stock_mode','reserved') not in ('reserved','waiting') then raise exception 'Modalidad de apartado inválida.';end if;
 if p_payload->>'stock_mode'='waiting' then
  if v_kind<>'reservation' then raise exception 'Solo los apartados pueden esperar existencia.';end if;
  if not public.has_commerce_permission('products.read') then raise exception 'No tienes permiso para consultar productos.' using errcode='42501';end if;
  if nullif(p_payload->>'delivery_id','') is not null then raise exception 'Una solicitud sin existencia todavía no tiene entrega asignada.';end if;
  if p_payload->>'stock_source' is null or p_payload->>'stock_source' not in ('warehouse','seller') then raise exception 'Selecciona de qué inventario se surtirá el apartado.';end if;
  if p_payload->>'stock_source'='warehouse' and not public.has_commerce_permission('inventory.sell_workshop') then raise exception 'Solo puedes solicitar mercancía para tu propio inventario.' using errcode='42501';end if;
  select full_name into v_seller from public.profiles where id=v_actor and is_active;
  insert into public.commerce_orders(id,kind,status,customer_name,customer_phone,notes,total,deposit,payment_method,due_date,delivery_date,created_by,seller_name,stock_status,stock_source)
  values(v_id,'reservation','active',v_name,v_phone,v_notes,v_price*v_quantity,v_deposit,v_method,v_date,v_delivery,v_actor,coalesce(v_seller,'Personal ARMA'),'waiting',p_payload->>'stock_source');
  insert into public.commerce_order_items(order_id,product_variant_id,inventory_balance_id,product_id,product_name,sku,size,color,quantity,catalog_price,unit_price)
  values(v_id,v_variant.id,null,v_product.id,v_product.name,v_variant.sku,v_variant.size,v_variant.color,v_quantity,v_variant.sale_price,v_price);
  return v_id;
 end if;
 v_delivery_id:=nullif(p_payload->>'delivery_id','')::uuid;
 if v_delivery_id is not null then
  select * into v_lot from arma_private.seller_deliveries where id=v_delivery_id and seller_id=v_actor and product_variant_id=v_variant.id;
  if not found then raise exception 'Esta entrega no pertenece a tu inventario.' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtextextended('seller:'||v_actor::text,0));
  if v_price<v_lot.unit_price then raise exception 'El precio al cliente no puede ser menor al importe acordado con ARMA.';end if;
 elsif not public.has_commerce_permission('inventory.sell_workshop') then
  raise exception 'Solo puedes vender o apartar piezas asignadas a tu inventario.' using errcode='42501';
 end if;
 select b.* into v_balance from public.inventory_balances b join public.inventory_locations l on l.id=b.location_id
 where b.product_variant_id=v_variant.id and l.is_active and ((v_delivery_id is null and l.is_default) or (v_delivery_id is not null and l.id=v_lot.location_id)) for update of b;
 if not found or v_balance.available_quantity<v_quantity then raise exception 'Ya no hay suficientes piezas disponibles. Actualiza el producto.' using errcode='P0001'; end if;
 select full_name into v_seller from public.profiles where id=v_actor and is_active;
 insert into public.commerce_orders(id,kind,status,customer_name,customer_phone,notes,total,deposit,payment_method,due_date,delivery_date,created_by,seller_name,stock_source)
 values(v_id,v_kind,case when v_kind='sale' then 'completed' else 'active' end,v_name,v_phone,v_notes,v_price*v_quantity,v_deposit,v_method,v_date,v_delivery,v_actor,coalesce(v_seller,'Personal ARMA'),case when v_delivery_id is null then 'warehouse' else 'seller' end);
 if v_delivery_id is not null then insert into arma_private.seller_order_links values(v_id,v_delivery_id);end if;
 insert into public.commerce_order_items(order_id,product_variant_id,inventory_balance_id,product_id,product_name,sku,size,color,quantity,catalog_price,unit_price)
 values(v_id,v_variant.id,v_balance.id,v_product.id,v_product.name,v_variant.sku,v_variant.size,v_variant.color,v_quantity,v_variant.sale_price,v_price);
 update public.inventory_balances set physical_quantity=physical_quantity-case when v_kind='sale' then v_quantity else 0 end,
 reserved_quantity=reserved_quantity+case when v_kind='reservation' then v_quantity else 0 end,updated_at=now() where id=v_balance.id;
 insert into public.inventory_movements(inventory_balance_id,movement_type,physical_delta,reserved_delta,reason,created_by,commerce_order_id)
 values(v_balance.id,case when v_kind='sale' then 'sale' else 'reservation' end,case when v_kind='sale' then -v_quantity else 0 end,
 case when v_kind='reservation' then v_quantity else 0 end,case when v_kind='sale' then 'Venta registrada' else 'Apartado registrado' end,v_actor,v_id);
 return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION arma_private.resolve_reservation(p_id uuid, p_action text, p_request_id uuid, p_payment_method text, p_refund_confirmed boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_actor uuid:=auth.uid(); v_order public.commerce_orders; v_item public.commerce_order_items; v_balance public.inventory_balances; v_seller text;v_delivery uuid;
begin
 if v_actor is null or not public.has_commerce_permission(case when p_action='complete' then 'sales.complete' else 'reservations.cancel' end) then raise exception 'Tu cuenta no tiene permiso para administrar apartados.' using errcode='42501'; end if;
 if p_action is null or p_action not in ('complete','cancel') then raise exception 'Acción inválida.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('seller:'||o.created_by::text,0)) from public.commerce_orders o where o.id=p_id and o.stock_source='seller';
 perform pg_advisory_xact_lock(hashtextextended('seller:'||d.seller_id::text,0)) from arma_private.seller_deliveries d join arma_private.seller_order_links link on link.delivery_id=d.id where link.order_id=p_id;
 select * into v_order from public.commerce_orders where id=p_id and kind='reservation' for update;
 if not found or (v_order.created_by<>v_actor and not public.has_commerce_permission('commerce.manage_all')) then raise exception 'Apartado no encontrado.'; end if;
 select delivery_id into v_delivery from arma_private.seller_order_links where order_id=p_id;
 if v_order.status='fulfilled' and p_action='complete' then return v_order.sale_id; end if;
 if v_order.status='cancelled' and p_action='cancel' then return v_order.id; end if;
 if v_order.status<>'active' then raise exception 'Este apartado ya fue cerrado. Actualiza el listado.'; end if;
 if p_action='complete' and v_order.stock_status='waiting' then raise exception 'Primero asigna existencia al apartado antes de completar la venta.';end if;
 if p_action='complete' and (p_request_id is null or p_payment_method is null or p_payment_method not in ('cash','transfer','card')) then raise exception 'Selecciona la forma de pago del saldo.'; end if;
 if p_action='cancel' and v_order.deposit>0 and not coalesce(p_refund_confirmed,false) then raise exception 'Confirma la devolución del anticipo antes de cancelar.'; end if;
 if p_action='complete' then
  select full_name into v_seller from public.profiles where id=v_actor;
  insert into public.commerce_orders(id,kind,status,customer_name,customer_phone,notes,total,deposit,payment_method,created_by,seller_name,source_reservation_id,applied_deposit,stock_source)
  values(p_request_id,'sale','completed',v_order.customer_name,v_order.customer_phone,v_order.notes,v_order.total,0,p_payment_method,case when v_delivery is not null then v_order.created_by else v_actor end,case when v_delivery is not null then v_order.seller_name else coalesce(v_seller,'Personal ARMA') end,p_id,v_order.deposit,v_order.stock_source);
 if v_delivery is not null then insert into arma_private.seller_order_links values(p_request_id,v_delivery);end if;
 end if;
 for v_item in select * from public.commerce_order_items where order_id=p_id and v_order.stock_status='reserved' order by inventory_balance_id loop
  select * into v_balance from public.inventory_balances where id=v_item.inventory_balance_id for update;
  if not found or v_balance.reserved_quantity<v_item.quantity or v_balance.physical_quantity<v_item.quantity then raise exception 'El inventario del apartado requiere revisión.'; end if;
  update public.inventory_balances set physical_quantity=physical_quantity-case when p_action='complete' then v_item.quantity else 0 end,
  reserved_quantity=reserved_quantity-v_item.quantity,updated_at=now() where id=v_balance.id;
  insert into public.inventory_movements(inventory_balance_id,movement_type,physical_delta,reserved_delta,reason,created_by,commerce_order_id)
  values(v_balance.id,case when p_action='complete' then 'sale' else 'reservation_release' end,case when p_action='complete' then -v_item.quantity else 0 end,
  -v_item.quantity,case when p_action='complete' then 'Venta de apartado' else 'Cancelación de apartado' end,v_actor,case when p_action='complete' then p_request_id else p_id end);
  if p_action='complete' then
   insert into public.commerce_order_items(order_id,product_variant_id,inventory_balance_id,product_id,product_name,sku,size,color,quantity,catalog_price,unit_price)
   values(p_request_id,v_item.product_variant_id,v_item.inventory_balance_id,v_item.product_id,v_item.product_name,v_item.sku,v_item.size,v_item.color,v_item.quantity,v_item.catalog_price,v_item.unit_price);
  end if;
 end loop;
 update public.commerce_orders set status=case when p_action='complete' then 'fulfilled' else 'cancelled' end,closed_at=now(),closed_by=v_actor,
 sale_id=case when p_action='complete' then p_request_id else null end,refunded_amount=case when p_action='cancel' then deposit else 0 end where id=p_id;
 return case when p_action='complete' then p_request_id else p_id end;
end;
$function$;

CREATE OR REPLACE FUNCTION arma_private.company_finances(p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
 if not public.has_commerce_permission('business.read') or not public.has_commerce_permission('commerce.read_all') then raise exception 'No tienes permiso para consultar las finanzas de ARMA.' using errcode='42501';end if;
 with events as materialized(
 -- Direct retail and consignment generate an ARMA sale when sold to the customer.
 select o.created_at happened_at,
 case when d.id is null then i.unit_price else d.unit_price end*i.quantity revenue,
 i.unit_cost*i.quantity cost,i.quantity unknown_pieces
 from public.commerce_orders o join public.commerce_order_items i on i.order_id=o.id
 left join arma_private.seller_order_links l on l.order_id=o.id left join arma_private.seller_deliveries d on d.id=l.delivery_id
 where o.kind='sale' and (d.id is null or d.payment_terms='consignment')
 union all
 -- A paid/credit purchase is recorded once at handover, not again at the seller's resale.
 select d.created_at,d.quantity*d.unit_price,d.quantity*d.unit_cost_at_delivery,d.quantity from arma_private.seller_deliveries d where d.payment_terms in('paid','credit')
 union all
 select r.created_at,
 case when d.id is null then -r.refund else -r.quantity*d.unit_price end,
 case when r.restock then -r.quantity*i.unit_cost else 0 end,
 case when r.restock then r.quantity else 0 end
 from arma_private.sale_returns r join public.commerce_order_items i on i.id=r.item_id
 left join arma_private.seller_order_links l on l.order_id=r.order_id left join arma_private.seller_deliveries d on d.id=l.delivery_id
 where d.id is null or d.payment_terms='consignment'
 union all
 select r.created_at,-r.quantity*d.unit_price,-r.quantity*d.unit_cost_at_delivery,r.quantity
 from arma_private.seller_stock_returns r join arma_private.seller_deliveries d on d.id=r.delivery_id where d.payment_terms in('paid','credit')
 ), period_events as materialized(select * from events where happened_at>=p_start and happened_at<p_end),
 money as materialized(
 select p.amount,p.method,p.created_at from arma_private.commerce_payments p
 where not exists(select 1 from arma_private.seller_order_links l where l.order_id=p.order_id) and exists(select 1 from public.commerce_orders o where o.id=p.order_id and o.stock_source='warehouse')
 union all
 select case when direction='payment' then amount else -amount end,method,created_at from arma_private.seller_settlements
 ), period_money as materialized(select * from money where created_at>=p_start and created_at<p_end)
 select jsonb_build_object(
 'revenue',coalesce((select sum(revenue) from period_events),0),
 'known_cost',coalesce((select sum(cost) from period_events),0),
 'known_margin',coalesce((select sum(revenue-cost) from period_events where cost is not null),0),
 'unknown_cost_pieces',coalesce((select sum(unknown_pieces) from period_events where cost is null),0),
 'received',coalesce((select sum(amount) from period_money where amount>0),0),
 'refunded',coalesce((select -sum(amount) from period_money where amount<0),0),
 'net_receipts',coalesce((select sum(amount) from period_money),0),
 'series',(select jsonb_agg(jsonb_build_object('date',calendar_day::date,
 'revenue',coalesce((select sum(revenue) from period_events where (happened_at at time zone 'America/Monterrey')::date=calendar_day::date),0),
 'margin',coalesce((select sum(revenue-cost) from period_events where cost is not null and (happened_at at time zone 'America/Monterrey')::date=calendar_day::date),0),
 'receipts',coalesce((select sum(amount) from period_money where (created_at at time zone 'America/Monterrey')::date=calendar_day::date),0)) order by calendar_day)
 from generate_series((p_start at time zone 'America/Monterrey')::date::timestamp,((p_end at time zone 'America/Monterrey')::date-1)::timestamp,interval '1 day') as days(calendar_day)),
 'payments',coalesce((select jsonb_agg(x order by x.method) from (select method,coalesce(sum(amount) filter(where amount>0),0) received,coalesce(-sum(amount) filter(where amount<0),0) refunded,sum(amount) net from period_money group by method)x),'[]'::jsonb)
 ) into result;
 return result;
end;$function$;

CREATE OR REPLACE FUNCTION public.commerce_orders_page(p_kind text, p_page integer DEFAULT 1, p_search text DEFAULT ''::text, p_status text DEFAULT ''::text, p_delivery text DEFAULT ''::text, p_period text DEFAULT 'all'::text, p_seller uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare v_today date:=(now() at time zone 'America/Monterrey')::date;v_delivery date;v_result jsonb;v_digits text;
begin
 if not public.has_commerce_permission(case when p_kind='sale' then 'sales.read' else 'reservations.read' end) then raise exception 'Tu cuenta no tiene permiso para consultar ventas y apartados.' using errcode='42501'; end if;
 if p_kind is null or p_kind not in ('sale','reservation') or p_page is null or p_page not between 1 and 1000000 or p_search is null or length(p_search)>120 or p_status is null or p_status not in ('','pending','waiting_stock','active','cancelled','fulfilled','completed','delivered') or p_delivery is null or p_period is null or p_period not in ('all','today','week','month') then raise exception 'Filtro inválido.'; end if;
 if p_seller is not null and not public.has_commerce_permission('commerce.read_all') then raise exception 'No puedes filtrar registros de otro vendedor.' using errcode='42501'; end if;
 if p_delivery not in ('','overdue','unscheduled') then v_delivery:=p_delivery::date; end if;
 v_digits:=regexp_replace(p_search,'[^0-9]','','g');
 with base as materialized (
 select o.* from public.commerce_orders o where o.kind=p_kind and (p_seller is null or o.created_by=p_seller) and (p_status='' or o.status=p_status or (p_status='waiting_stock' and o.stock_status='waiting' and o.status='active') or (p_status='pending' and o.status in ('active','fulfilled') and o.delivered_at is null) or (p_status='delivered' and o.delivered_at is not null))
 and (p_kind='reservation' or p_period='all' or (p_period='today' and o.created_at>=(v_today::timestamp at time zone 'America/Monterrey'))
 or (p_period='week' and o.created_at>=(date_trunc('week',v_today::timestamp) at time zone 'America/Monterrey'))
 or (p_period='month' and o.created_at>=now()-interval '30 days'))
 and (trim(p_search)='' or strpos(lower(o.customer_name),lower(trim(p_search)))>0 or strpos(lpad(o.order_number::text,4,'0'),trim(p_search))>0
 or (length(v_digits)>=3 and p_search!~'[[:alpha:]]' and (strpos(regexp_replace(o.customer_phone,'[^0-9]','','g'),v_digits)>0 or (length(v_digits)>=10 and right(regexp_replace(o.customer_phone,'[^0-9]','','g'),10)=right(v_digits,10))))
 or exists(select 1 from public.commerce_items_display i where i.order_id=o.id and strpos(lower(i.product_name||' '||i.sku),lower(trim(p_search)))>0))
 ), matched as materialized (
 select * from base where p_delivery='' or delivery_date=v_delivery or (status in ('active','fulfilled') and delivered_at is null and ((p_delivery='overdue' and delivery_date<v_today) or (p_delivery='unscheduled' and delivery_date is null)))
 ), stats as(select count(*) total,greatest(1,least(p_page,ceil(count(*)/12.0)::integer)) page from matched),
 selected as(select * from matched order by case when p_kind='reservation' then delivery_date end asc nulls last,created_at desc,id desc limit 12 offset(select (page-1)*12 from stats)),
 active as materialized(select o.*,(select sum(quantity) from public.commerce_items_display i where i.order_id=o.id) pieces from base o where status in ('active','fulfilled') and delivered_at is null),
 schedule as(select delivery_date,count(*) orders,sum(pieces) pieces from active where delivery_date>=v_today group by delivery_date order by delivery_date limit 7),
 sale_totals as(select count(*) orders,coalesce(sum(total),0) revenue,coalesce(avg(total),0) average_ticket,
 coalesce(sum((select sum(quantity) from public.commerce_items_display i where i.order_id=o.id)),0) pieces,
 coalesce(sum((select sum(greatest(catalog_price-unit_price,0)*quantity) from public.commerce_items_display i where i.order_id=o.id)),0) discounts,
 coalesce(sum(o.applied_deposit),0) applied_deposits from base o),
 payment_totals as(select payment_method method,count(*) orders,sum(total-o.applied_deposit) amount from base o group by payment_method)
 select jsonb_build_object('total',s.total,'page',s.page,'items',coalesce((select jsonb_agg(to_jsonb(o)||jsonb_build_object(
 'items',(select jsonb_agg(to_jsonb(i)||jsonb_build_object('cover_path',(
 select case when pi.thumbnail_path is not null and exists(select 1 from storage.objects so where so.bucket_id=pi.storage_bucket and so.name=pi.thumbnail_path) then pi.thumbnail_path else pi.storage_path end
 from public.product_images pi where pi.product_id=i.product_id and pi.is_cover order by pi.sort_order limit 1
 )) order by i.id) from public.commerce_items_display i where i.order_id=o.id),
 'source_deposit',o.applied_deposit
 ) order by case when p_kind='reservation' then o.delivery_date end asc nulls last,o.created_at desc,o.id desc) from selected o),'[]'::jsonb),
 'delivery_summary',jsonb_build_object('scheduled',coalesce((select jsonb_agg(jsonb_build_object('date',delivery_date,'orders',orders,'pieces',pieces) order by delivery_date) from schedule),'[]'::jsonb),
 'overdue_orders',(select count(*) from active where delivery_date<v_today),'overdue_pieces',coalesce((select sum(pieces) from active where delivery_date<v_today),0),
 'unscheduled_orders',(select count(*) from active where delivery_date is null),'unscheduled_pieces',coalesce((select sum(pieces) from active where delivery_date is null),0)),
 'sales_summary',(select to_jsonb(t)||jsonb_build_object('payments',coalesce((select jsonb_agg(jsonb_build_object('method',method,'orders',orders,'amount',amount) order by amount desc) from payment_totals),'[]'::jsonb)) from sale_totals t)
 ) into v_result from stats s;
 return v_result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.reservation_calendar(p_from date, p_to date, p_search text DEFAULT ''::text, p_status text DEFAULT 'pending'::text, p_seller uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare v_today date:=(now() at time zone 'America/Monterrey')::date;v_digits text;v_result jsonb;
begin
 if not public.has_commerce_permission('reservations.read') then raise exception 'Tu cuenta no tiene acceso a apartados.' using errcode='42501';end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>42 or extract(year from p_from) not between 1900 and 2200 or extract(year from p_to) not between 1900 and 2200 or p_search is null or length(p_search)>120 or p_status is null or p_status not in ('','pending','waiting_stock','active','fulfilled','delivered','cancelled') then raise exception 'Filtros de calendario inválidos.';end if;
 if p_seller is not null and not public.has_commerce_permission('commerce.read_all') then raise exception 'No puedes consultar apartados de otro vendedor.' using errcode='42501';end if;
 v_digits:=regexp_replace(p_search,'[^0-9]','','g');
 with base as materialized(
 select o.id,o.status,o.stock_status,o.delivery_date,o.delivered_at,o.total-o.deposit balance,
 coalesce((select sum(i.quantity) from public.commerce_order_items i where i.order_id=o.id),0) pieces
 from public.commerce_orders o where o.kind='reservation' and (p_seller is null or o.created_by=p_seller) and (p_status='' or o.status=p_status or (p_status='waiting_stock' and o.stock_status='waiting' and o.status='active') or (p_status='pending' and o.status in ('active','fulfilled') and o.delivered_at is null) or (p_status='delivered' and o.delivered_at is not null)) and (trim(p_search)='' or strpos(lower(o.customer_name),lower(trim(p_search)))>0 or strpos(lpad(o.order_number::text,4,'0'),trim(p_search))>0
 or (length(v_digits)>=3 and p_search!~'[[:alpha:]]' and (strpos(regexp_replace(o.customer_phone,'[^0-9]','','g'),v_digits)>0 or (length(v_digits)>=10 and right(regexp_replace(o.customer_phone,'[^0-9]','','g'),10)=right(v_digits,10))))
 or exists(select 1 from public.commerce_order_items i where i.order_id=o.id and strpos(lower(i.product_name||' '||i.sku),lower(trim(p_search)))>0))
 ),pending as materialized(select * from base where status in ('active','fulfilled') and delivered_at is null),
 days as(select delivery_date date,count(*) orders,sum(pieces) pieces,count(*) filter(where status in ('active','fulfilled') and delivered_at is null) pending_orders from base where delivery_date between p_from and p_to group by delivery_date)
 select jsonb_build_object('days',coalesce((select jsonb_agg(to_jsonb(d) order by date) from days d),'[]'::jsonb),'summary',jsonb_build_object(
 'waiting_orders',(select count(*) from pending where stock_status='waiting'),'waiting_pieces',coalesce((select sum(pieces) from pending where stock_status='waiting'),0),
 'pending_orders',(select count(*) from pending),'pending_pieces',coalesce((select sum(pieces) from pending),0),
 'balance',coalesce((select sum(balance) from pending where status='active'),0),
 'overdue_orders',(select count(*) from pending where delivery_date<v_today),
 'unscheduled_orders',(select count(*) from pending where delivery_date is null),
 'unscheduled_pieces',coalesce((select sum(pieces) from pending where delivery_date is null),0))) into v_result;
 return v_result;
end;$function$;


create function arma_private.reservation_stock_options(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_order public.commerce_orders;v_variant uuid;v_quantity integer;v_price numeric;v_lots jsonb;v_available integer;
begin
 if not public.has_commerce_permission('reservations.read') then raise exception 'No tienes permiso para consultar apartados.' using errcode='42501';end if;
 select * into v_order from public.commerce_orders where id=p_id and kind='reservation';
 if not found or (v_order.created_by<>auth.uid() and not public.has_commerce_permission('commerce.read_all')) then raise exception 'Apartado no disponible.' using errcode='42501';end if;
 select product_variant_id,quantity,unit_price into v_variant,v_quantity,v_price from public.commerce_order_items where order_id=p_id;
 if v_order.stock_source='warehouse' then
  select coalesce(sum(b.available_quantity),0)::integer into v_available from public.inventory_balances b join public.inventory_locations l on l.id=b.location_id where l.is_default and l.is_active and b.product_variant_id=v_variant;
  v_lots:='[]';
 else
  select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'available',b.available_quantity,'unit_price',d.unit_price,'created_at',d.created_at) order by d.created_at,d.id),'[]') into v_lots
  from arma_private.seller_deliveries d join public.inventory_balances b on b.location_id=d.location_id and b.product_variant_id=d.product_variant_id
  join public.inventory_locations loc on loc.id=d.location_id and loc.is_active
  where d.seller_id=v_order.created_by and d.product_variant_id=v_variant and b.available_quantity>0;
  select coalesce(sum((j->>'available')::int),0) into v_available from jsonb_array_elements(v_lots) j;
 end if;
 return jsonb_build_object('source',v_order.stock_source,'quantity',v_quantity,'unit_price',v_price,'available',v_available,'lots',v_lots);
end;$$;
revoke all on function arma_private.reservation_stock_options(uuid) from public,anon,authenticated;
grant execute on function arma_private.reservation_stock_options(uuid) to authenticated;
create function public.reservation_stock_options(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select arma_private.reservation_stock_options(p_id);$$;
revoke all on function public.reservation_stock_options(uuid) from public,anon,authenticated;
grant execute on function public.reservation_stock_options(uuid) to authenticated;

create function arma_private.assign_reservation_stock(p_id uuid,p_delivery_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_order public.commerce_orders;v_item public.commerce_order_items;v_lot arma_private.seller_deliveries;v_balance public.inventory_balances;
begin
 if v_actor is null or not public.has_commerce_permission('reservations.create') then raise exception 'No tienes permiso para asignar existencia a apartados.' using errcode='42501';end if;
 -- Seller operations share the existing lock order: seller, order, balance.
 perform pg_advisory_xact_lock(hashtextextended('seller:'||o.created_by::text,0)) from public.commerce_orders o where o.id=p_id and o.stock_source='seller';
 select * into v_order from public.commerce_orders where id=p_id and kind='reservation' for update;
 if not found or (v_order.created_by<>v_actor and not public.has_commerce_permission('commerce.manage_all')) then raise exception 'Apartado no disponible.' using errcode='42501';end if;
 if v_order.stock_status='reserved' then return v_order.id;end if;
 if v_order.status<>'active' then raise exception 'Este apartado ya fue cerrado.';end if;
 if (select count(*) from public.commerce_order_items where order_id=p_id)<>1 then raise exception 'El apartado requiere revisión de sus piezas.';end if;
 select * into v_item from public.commerce_order_items where order_id=p_id for update;
 perform 1 from public.product_variants v join public.products p on p.id=v.product_id where v.id=v_item.product_variant_id and v.is_active and p.is_active for share of v,p;
 if not found then raise exception 'El producto o la variante ya no están activos.';end if;
 if v_order.stock_source='seller' then
  if p_delivery_id is null then raise exception 'Selecciona una entrega asignada al vendedor.';end if;
  select * into v_lot from arma_private.seller_deliveries where id=p_delivery_id and seller_id=v_order.created_by and product_variant_id=v_item.product_variant_id;
  if not found then raise exception 'La entrega no pertenece a este vendedor o variante.' using errcode='42501';end if;
  if v_item.unit_price<v_lot.unit_price then raise exception 'El precio acordado con el cliente es menor que el importe para ARMA de esta entrega.';end if;
 else
  if p_delivery_id is not null or not public.has_commerce_permission('inventory.sell_workshop') then raise exception 'No tienes acceso al inventario del taller.' using errcode='42501';end if;
 end if;
 select b.* into v_balance from public.inventory_balances b join public.inventory_locations l on l.id=b.location_id where b.product_variant_id=v_item.product_variant_id and l.is_active and ((v_order.stock_source='warehouse' and l.is_default) or (v_order.stock_source='seller' and l.id=v_lot.location_id)) for update of b;
 if not found or v_balance.available_quantity<v_item.quantity then raise exception 'Todavía no hay suficientes piezas disponibles para cubrir este apartado.';end if;
 update public.inventory_balances set reserved_quantity=reserved_quantity+v_item.quantity,updated_at=now() where id=v_balance.id;
 update public.commerce_order_items set inventory_balance_id=v_balance.id where id=v_item.id;
 if v_order.stock_source='seller' then insert into arma_private.seller_order_links(order_id,delivery_id) values(p_id,p_delivery_id);end if;
 update public.commerce_orders set stock_status='reserved',stock_assigned_at=now() where id=p_id;
 insert into public.inventory_movements(inventory_balance_id,movement_type,physical_delta,reserved_delta,reason,created_by,commerce_order_id)
 values(v_balance.id,'reservation',0,v_item.quantity,'Existencia asignada a pedido pendiente',v_actor,p_id);
 return p_id;
end;$$;
revoke all on function arma_private.assign_reservation_stock(uuid,uuid) from public,anon,authenticated;
grant execute on function arma_private.assign_reservation_stock(uuid,uuid) to authenticated;
create function public.assign_reservation_stock(p_id uuid,p_delivery_id uuid default null) returns uuid language sql security invoker set search_path='' as $$select arma_private.assign_reservation_stock(p_id,p_delivery_id);$$;
revoke all on function public.assign_reservation_stock(uuid,uuid) from public,anon,authenticated;
grant execute on function public.assign_reservation_stock(uuid,uuid) to authenticated;
