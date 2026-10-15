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
 return j;
end $function$;
