-- No customer data or historical sale prices are rewritten.
alter table arma_private.role_changes enable row level security;
revoke all on public.commerce_items_display from anon;
revoke insert,update,delete,truncate,references,trigger on public.commerce_items_display from authenticated;
update storage.buckets set allowed_mime_types=array['image/png','image/jpeg','image/webp'] where id='inventory-images';

-- An API caller must not see another seller's stock by querying balances directly.
create or replace function arma_private.can_read_stock_location(p_location uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select arma_private.actor_ready() and (
 public.has_commerce_permission('consignments.manage')
 or (public.has_commerce_permission('inventory.sell_workshop') and exists(select 1 from public.inventory_locations l where l.id=p_location and l.is_default and l.is_active))
 or exists(select 1 from arma_private.seller_deliveries d where d.location_id=p_location and d.seller_id=auth.uid()));
$$;
revoke all on function arma_private.can_read_stock_location(uuid) from public,anon;
grant execute on function arma_private.can_read_stock_location(uuid) to authenticated;
alter policy inventory_read on public.inventory_balances to authenticated using(
 (product_variant_id is not null and (select public.has_commerce_permission('products.read')) and arma_private.can_read_stock_location(location_id))
 or (material_variant_id is not null and (select public.has_commerce_permission('materials.read'))));
-- Production is a separate editable permission, not an accidental consequence of materials.read.
alter policy inventory_read on public.production_orders to authenticated using((select public.has_commerce_permission('production.read')));
alter policy inventory_read on public.production_inputs to authenticated using((select public.has_commerce_permission('production.read')));
alter policy inventory_read on public.production_outputs to authenticated using((select public.has_commerce_permission('production.read')));

alter table arma_private.seller_deliveries add column unit_cost_at_delivery numeric(14,4) check(unit_cost_at_delivery>=0 and unit_cost_at_delivery::text not in('NaN','Infinity','-Infinity'));
-- Recover only the original recorded movement, never today's changing average.
update arma_private.seller_deliveries d set unit_cost_at_delivery=(
 select m.unit_cost from public.inventory_movements m join public.inventory_balances b on b.id=m.inventory_balance_id
 where b.location_id=d.location_id and m.reason='Recepción de entrega · '||d.id::text and m.movement_type='entry' and m.physical_delta=d.quantity
 order by m.created_at,m.id limit 1);
CREATE OR REPLACE FUNCTION arma_private.seller_write(p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare actor uuid:=auth.uid();req uuid;action text;s uuid;qty int;price numeric;terms text;amt numeric;d arma_private.seller_deliveries;src public.inventory_balances;dst public.inventory_balances;loc uuid;j jsonb;begin
 if not public.has_commerce_permission('consignments.manage') then raise exception 'No tienes permiso para gestionar vendedores.' using errcode='42501';end if;
 req:=(p_payload->>'request_id')::uuid;action:=p_payload->>'action';s:=(p_payload->>'seller_id')::uuid;
 if req is null or s is null or action is null or action not in('deliver','return','payment','refund') then raise exception 'Solicitud inválida.';end if;
 perform pg_advisory_xact_lock(hashtextextended('seller:'||s::text,0));
 if exists(select 1 from arma_private.seller_deliveries where id=req and created_by=actor and seller_id=s) or exists(select 1 from arma_private.seller_settlements where id=req and created_by=actor and seller_id=s) or exists(select 1 from arma_private.seller_stock_returns r join arma_private.seller_deliveries delivery on delivery.id=r.delivery_id where r.id=req and r.created_by=actor and delivery.seller_id=s) then return req;end if;
 if not exists(select 1 from public.profiles where id=s) then raise exception 'Cuenta no encontrada.';end if;
 if action='deliver' then
  qty:=(p_payload->>'quantity')::int;price:=(p_payload->>'unit_price')::numeric;
  if qty is null or qty not between 1 and 10000 or price is null or price::text in('NaN','Infinity','-Infinity') or price<=0 or price>999999 or price<>round(price,2) or length(coalesce(p_payload->>'notes',''))>500 then raise exception 'Revisa cantidad, precio y notas.';end if;
  terms:=coalesce(p_payload->>'payment_terms','consignment');
  if terms not in('consignment','paid','credit') then raise exception 'Selecciona una modalidad válida de entrega.';end if;
  if terms='paid' and (qty*price>99999999 or p_payload->>'method' is null or p_payload->>'method' not in('cash','transfer','card') or length(coalesce(p_payload->>'reference',''))>200) then raise exception 'Revisa el total y el medio del pago recibido.';end if;
  if not exists(select 1 from public.profiles where id=s and is_active) then raise exception 'El vendedor está deshabilitado.';end if;
  perform 1 from public.product_variants v join public.products p on p.id=v.product_id where v.id=(p_payload->>'variant_id')::uuid and v.is_active and p.is_active and v.currency='MXN' and upper(trim(v.size)) in('S','M','L') for share of v,p;
  if not found then raise exception 'Producto no disponible.';end if;
  select b.* into src from public.inventory_balances b join public.inventory_locations l on l.id=b.location_id and l.is_default and l.is_active where b.product_variant_id=(p_payload->>'variant_id')::uuid for update of b;
  if not found or src.available_quantity<qty then raise exception 'No hay suficientes piezas disponibles en el taller.';end if;
  loc:=gen_random_uuid();insert into public.inventory_locations(id,code,name) values(loc,'SELLER-'||req::text,'Entrega a vendedor');
  insert into arma_private.seller_deliveries(id,seller_id,product_variant_id,location_id,quantity,unit_price,notes,created_by,created_at,payment_terms,unit_cost_at_delivery) values(req,s,src.product_variant_id,loc,qty,price,coalesce(p_payload->>'notes',''),actor,now(),terms,src.average_unit_cost);
  if terms='paid' then insert into arma_private.seller_settlements(id,seller_id,amount,direction,method,reference,created_by,delivery_id) values(req,s,qty*price,'payment',p_payload->>'method','Pago al entregar mercancía'||case when coalesce(p_payload->>'reference','')<>'' then ' · '||(p_payload->>'reference') else '' end,actor,req);end if;
  insert into public.inventory_balances(location_id,product_variant_id,physical_quantity,average_unit_cost) values(loc,src.product_variant_id,qty,src.average_unit_cost) returning * into dst;
  update public.inventory_balances set physical_quantity=physical_quantity-qty,updated_at=now() where id=src.id;
  insert into public.inventory_movements(inventory_balance_id,movement_type,physical_delta,unit_cost,reason,created_by) values(src.id,'adjustment',-qty,src.average_unit_cost,'Entrega a vendedor · '||req::text,actor),(dst.id,'entry',qty,src.average_unit_cost,'Recepción de entrega · '||req::text,actor);
 elsif action='return' then
  select * into d from arma_private.seller_deliveries where id=(p_payload->>'delivery_id')::uuid and seller_id=s;
  if not found then raise exception 'Entrega no encontrada.';end if;
  qty:=(p_payload->>'quantity')::int;if qty is null or qty<1 or qty>10000 then raise exception 'Cantidad inválida.';end if;
  select b.* into dst from public.inventory_balances b join public.inventory_locations l on l.id=b.location_id and l.is_default and l.is_active where b.product_variant_id=d.product_variant_id for update of b;
  select * into src from public.inventory_balances where location_id=d.location_id for update;
  if src.available_quantity<qty then raise exception 'No puedes devolver piezas vendidas o apartadas.';end if;
  update public.inventory_balances set average_unit_cost=case when dst.physical_quantity=0 then src.average_unit_cost when dst.average_unit_cost is null or src.average_unit_cost is null then null else round((dst.physical_quantity*dst.average_unit_cost+qty*src.average_unit_cost)/(dst.physical_quantity+qty),4) end,physical_quantity=physical_quantity+qty,updated_at=now() where id=dst.id;
  update public.inventory_balances set physical_quantity=physical_quantity-qty,updated_at=now() where id=src.id;
  insert into arma_private.seller_stock_returns values(req,d.id,qty,actor,now());
  insert into public.inventory_movements(inventory_balance_id,movement_type,physical_delta,unit_cost,reason,created_by) values(src.id,'adjustment',-qty,src.average_unit_cost,'Regreso al taller · '||req::text,actor),(dst.id,'entry',qty,src.average_unit_cost,'Regreso de vendedor · '||req::text,actor);
 else
  amt:=(p_payload->>'amount')::numeric;j:=arma_private.seller_totals(s);
  if amt is null or amt::text in('NaN','Infinity','-Infinity') or amt<=0 or amt>99999999 or amt<>round(amt,2) or p_payload->>'method' is null or p_payload->>'method' not in('cash','transfer','card') or length(coalesce(p_payload->>'reference',''))>200 then raise exception 'Revisa el importe y el medio de pago.';end if;
  if (action='payment' and amt>greatest(0,(j->>'due')::numeric)) or (action='refund' and amt>greatest(0,-(j->>'due')::numeric)) then raise exception 'El importe supera el saldo disponible.';end if;
  insert into arma_private.seller_settlements(id,seller_id,amount,direction,method,reference,created_by,created_at) values(req,s,amt,action,p_payload->>'method',coalesce(p_payload->>'reference',''),actor,now());
 end if;
 return req;
end;$function$;

-- Management report, not a tax ledger. Reseller retail proceeds never become ARMA proceeds.
create or replace function arma_private.company_finances(p_start timestamptz,p_end timestamptz)
returns jsonb language plpgsql stable security definer set search_path='' as $$
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
 where not exists(select 1 from arma_private.seller_order_links l where l.order_id=p.order_id)
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
 'payments',coalesce((select jsonb_agg(x order by x.method) from (select method,coalesce(sum(amount) filter(where amount>0),0) received,coalesce(-sum(amount) filter(where amount<0),0) refunded,sum(amount) net from period_money group by method)x),'[]'::jsonb)
 ) into result;
 return result;
end;$$;
revoke all on function arma_private.company_finances(timestamptz,timestamptz) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION arma_private.business_dashboard(p_from date, p_to date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare j jsonb;actor uuid:=auth.uid();all_rows boolean:=public.has_commerce_permission('commerce.read_all');finance boolean:=public.has_commerce_permission('business.read');sr boolean:=public.has_commerce_permission('sales.read');rr boolean:=public.has_commerce_permission('reservations.read');start_at timestamptz;end_at timestamptz;
begin
 if not arma_private.actor_ready() then raise exception 'Inicia sesión.' using errcode='42501';end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception 'Elige un período de hasta un año.';end if;
 start_at:=p_from::timestamp at time zone 'America/Monterrey';end_at:=(p_to+1)::timestamp at time zone 'America/Monterrey';
 with scoped as materialized(select * from public.commerce_orders where (created_by=actor or all_rows) and ((kind='sale' and sr) or (kind='reservation' and rr))),
 sales as materialized(select * from scoped where kind='sale' and created_at>=start_at and created_at<end_at),
 money as materialized(select p.* from arma_private.commerce_payments p join scoped o on o.id=p.order_id where p.created_at>=start_at and p.created_at<end_at),
 returns as materialized(select r.* from arma_private.sale_returns r join scoped o on o.id=r.order_id where r.created_at>=start_at and r.created_at<end_at),
 sale_items as materialized(select i.* from public.commerce_order_items i join sales s on s.id=i.order_id),
 dates as(select d::date as calendar_day from generate_series(p_from::timestamp,p_to::timestamp,interval '1 day') d)
 select jsonb_build_object('scope',case when all_rows then 'Negocio' else 'Mis operaciones' end,'finance',finance,
 'sales',coalesce((select sum(total) from sales),0),'sale_count',(select count(*) from sales),'pieces',coalesce((select sum(quantity) from sale_items),0),
 'average_price',coalesce((select sum(unit_price*quantity)/nullif(sum(quantity),0) from sale_items),0),
 'catalog_value',coalesce((select sum(catalog_price*quantity) from sale_items),0),
 'receipts',coalesce((select sum(amount) from money where amount>0),0),'refunds',coalesce((select -sum(amount) from money where amount<0),0),'net_receipts',coalesce((select sum(amount) from money),0),
 'returned_pieces',coalesce((select sum(quantity) from returns),0),'sales_refunds',coalesce((select sum(refund) from returns),0),
 'balance',coalesce((select sum(total-deposit) from scoped where kind='reservation' and status='active'),0),
 'pending_reservations',(select count(*) from scoped where kind='reservation' and status in('active','fulfilled') and delivered_at is null),
 'overdue',(select count(*) from scoped where kind='reservation' and status in('active','fulfilled') and delivered_at is null and delivery_date<(now() at time zone 'America/Monterrey')::date),
 'available',case when public.has_commerce_permission('products.read') then (select coalesce(sum(b.available_quantity),0) from public.inventory_balances b join public.product_variants v on v.id=b.product_variant_id join public.products p on p.id=v.product_id where v.is_active and p.is_active and upper(v.size) in('S','M','L') and ((public.has_commerce_permission('inventory.sell_workshop') and exists(select 1 from public.inventory_locations loc where loc.id=b.location_id and loc.is_default and loc.is_active)) or (not public.has_commerce_permission('inventory.sell_workshop') and exists(select 1 from arma_private.seller_deliveries d where d.location_id=b.location_id and d.seller_id=actor)))) else null end,
 'production_pending',case when public.has_commerce_permission('production.read') then (select count(*) from public.production_orders where status='draft' and planned_quantity is not null) else null end,
 'known_cost',case when finance then coalesce((select sum(unit_cost*quantity) from sale_items),0) else null end,
 'unknown_cost_pieces',case when finance then coalesce((select sum(quantity) from sale_items where unit_cost is null),0) else null end,
 'known_gross_margin',case when finance then coalesce((select sum((unit_price-unit_cost)*quantity) from sale_items where unit_cost is not null),0) else null end,
 'material_purchases',case when finance then coalesce((select sum(quantity*unit_cost) from arma_private.material_receipts where created_at>=start_at and created_at<end_at),0) else null end,
 'payments',coalesce((select jsonb_agg(x order by x.method) from(select method,coalesce(sum(amount) filter(where amount>0),0) received,coalesce(-sum(amount) filter(where amount<0),0) refunded,sum(amount) net from money group by method)x),'[]'),
 'series',(select jsonb_agg(jsonb_build_object('date',calendar_day,'sales',coalesce((select sum(total) from sales where (created_at at time zone 'America/Monterrey')::date=calendar_day),0),'receipts',coalesce((select sum(amount) from money where (created_at at time zone 'America/Monterrey')::date=calendar_day),0)) order by calendar_day) from dates),
 'top_products',coalesce((select jsonb_agg(x order by x.revenue desc) from(select i.product_name name,sum(i.quantity) pieces,sum(i.quantity*i.unit_price) revenue from sale_items i group by i.product_id,i.product_name order by revenue desc limit 5)x),'[]'),
 'recent',coalesce((select jsonb_agg(x order by x.created_at desc) from(select id,order_number,kind,status,customer_name,total,deposit,created_at,seller_name from scoped order by created_at desc limit 8)x),'[]'),
 'prices',case when finance then coalesce((select jsonb_agg(x order by x.label) from(select v.id,p.name||' · '||v.size||' · '||v.color label,v.sale_price catalog_price,
 (select sum(i.quantity*i.unit_price)/nullif(sum(i.quantity),0) from sale_items i where i.product_variant_id=v.id) actual_price,
 r.labor_cost,r.target_margin,(r.electricity_cost+r.tape_cost+r.other_cost) expenses,
 case when r.product_variant_id is not null and not exists(select 1 from arma_private.recipe_materials rm left join public.inventory_balances b on b.material_variant_id=rm.material_variant_id and b.location_id=(select id from public.inventory_locations where is_default and is_active) where rm.product_variant_id=v.id and arma_private.material_reference_cost(rm.material_variant_id) is null) then r.labor_cost+r.electricity_cost+r.tape_cost+r.other_cost+(select sum(rm.quantity*arma_private.material_reference_cost(rm.material_variant_id)) from arma_private.recipe_materials rm join public.inventory_balances b on b.material_variant_id=rm.material_variant_id and b.location_id=(select id from public.inventory_locations where is_default and is_active) where rm.product_variant_id=v.id) else null end cost
 from public.product_variants v join public.products p on p.id=v.product_id left join arma_private.product_recipes r on r.product_variant_id=v.id where v.is_active and p.is_active and upper(v.size) in('S','M','L') order by p.name,v.size limit 100)x),'[]') else '[]'::jsonb end,
 'stock_alerts',coalesce((select jsonb_agg(x order by x.available) from(
 select m.name||' · '||v.sku label,b.available_quantity available,'material'::text kind from public.inventory_balances b join public.material_variants v on v.id=b.material_variant_id join public.materials m on m.id=v.material_id where public.has_commerce_permission('materials.read') and v.is_active and m.is_active and b.available_quantity<=greatest(v.minimum_stock,5)
 union all select p.name||' · '||v.size||' · '||v.color,b.available_quantity,'product' from public.inventory_balances b join public.product_variants v on v.id=b.product_variant_id join public.products p on p.id=v.product_id where public.has_commerce_permission('products.read') and v.is_active and p.is_active and upper(v.size) in('S','M','L') and b.available_quantity<=greatest(v.minimum_stock,5) and ((public.has_commerce_permission('inventory.sell_workshop') and exists(select 1 from public.inventory_locations loc where loc.id=b.location_id and loc.is_default and loc.is_active)) or (not public.has_commerce_permission('inventory.sell_workshop') and exists(select 1 from arma_private.seller_deliveries d where d.location_id=b.location_id and d.seller_id=actor)))
 order by available limit 12)x),'[]')) into j;
 return j || jsonb_build_object('company',case when finance and all_rows then arma_private.company_finances(start_at,end_at) else null end);
end $function$;
