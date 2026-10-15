alter table arma_private.seller_deliveries add column payment_terms text not null default 'consignment' check(payment_terms in ('consignment','paid','credit'));
alter table arma_private.seller_settlements add column delivery_id uuid references arma_private.seller_deliveries(id);
create index seller_settlements_delivery on arma_private.seller_settlements(delivery_id) where delivery_id is not null;

CREATE OR REPLACE FUNCTION arma_private.seller_overview(p_seller uuid DEFAULT NULL::uuid, p_page integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s uuid;manager boolean;begin
 manager:=public.has_commerce_permission('consignments.manage');
 if not manager and not public.has_commerce_permission('consignments.read') then raise exception 'No tienes acceso a Vendedores.' using errcode='42501';end if;
 s:=coalesce(p_seller,auth.uid());
 if not manager and s<>auth.uid() then raise exception 'Solo puedes consultar tu inventario.' using errcode='42501';end if;
 if p_page is null or p_page<1 or p_page>1000000 then raise exception 'Página inválida.';end if;
 return jsonb_build_object('seller_id',s,'manager',manager,'summary',arma_private.seller_totals(s),
 'people',case when manager then coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',coalesce(p.full_name,'Sin nombre'),'active',p.is_active) order by p.full_name,p.id) from public.profiles p where p.is_active or exists(select 1 from arma_private.seller_deliveries d where d.seller_id=p.id)),'[]'::jsonb) else '[]'::jsonb end,
 'total',(select count(*) from arma_private.seller_deliveries where seller_id=s),
 'deliveries',coalesce((select jsonb_agg(x.row order by x.created_at desc,x.id) from (
 select d.id,d.created_at,jsonb_build_object('id',d.id,'created_at',d.created_at,'label',p.name||' · '||v.color||' · '||v.size,'product_id',p.id,'quantity',d.quantity,'unit_price',d.unit_price,'payment_terms',d.payment_terms,'initial_paid',coalesce((select sum(amount) from arma_private.seller_settlements ss where ss.delivery_id=d.id and ss.direction='payment'),0),'physical',b.physical_quantity,'reserved',b.reserved_quantity,'available',b.available_quantity,'returned',coalesce((select sum(quantity) from arma_private.seller_stock_returns where delivery_id=d.id),0),'notes',d.notes,'photo',arma_private.image_cover('product',p.id)) row
 from arma_private.seller_deliveries d join public.product_variants v on v.id=d.product_variant_id join public.products p on p.id=v.product_id join public.inventory_balances b on b.location_id=d.location_id where d.seller_id=s order by d.created_at desc,d.id limit 12 offset(p_page-1)*12) x),'[]'::jsonb),
 'payments_total',(select count(*) from arma_private.seller_settlements where seller_id=s),
 'payments',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id) from(select id,amount,direction,method,reference,created_at from arma_private.seller_settlements where seller_id=s order by created_at desc,id limit 12 offset(p_page-1)*12)x),'[]'::jsonb));
end;$function$;

CREATE OR REPLACE FUNCTION arma_private.seller_totals(p_seller uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with sales as (
 select d.payment_terms,d.unit_price,i.quantity,i.unit_price retail,coalesce(r.qty,0) returned,coalesce(r.refund,0) refund
 from arma_private.seller_deliveries d join arma_private.seller_order_links link on link.delivery_id=d.id
 join public.commerce_orders o on o.id=link.order_id and o.kind='sale'
 join public.commerce_order_items i on i.order_id=o.id
 left join lateral(select sum(quantity) qty,sum(refund) refund from arma_private.sale_returns where item_id=i.id) r on true
 where d.seller_id=p_seller
), sums as (select coalesce(sum((quantity-returned)*unit_price),0) sale_cost,coalesce(sum(case when payment_terms='consignment' then (quantity-returned)*unit_price else 0 end),0) consignment_owed,coalesce(sum(quantity*retail-refund),0) revenue,coalesce(sum(quantity-returned),0) pieces from sales),
purchases as (select coalesce(sum((d.quantity-coalesce(r.quantity,0))*d.unit_price),0) purchase_owed from arma_private.seller_deliveries d left join lateral(select sum(quantity) quantity from arma_private.seller_stock_returns where delivery_id=d.id) r on true where d.seller_id=p_seller and d.payment_terms in('paid','credit')),
settled as (select coalesce(sum(case when direction='payment' then amount else -amount end),0) paid from arma_private.seller_settlements where seller_id=p_seller)
select jsonb_build_object('due',consignment_owed+purchase_owed-paid,'earned',revenue-sale_cost,'revenue',revenue,'owed',consignment_owed+purchase_owed,'purchases',purchase_owed,'consignment_owed',consignment_owed,'paid',paid,'sold',pieces,
 'physical',coalesce((select sum(b.physical_quantity) from arma_private.seller_deliveries d join public.inventory_balances b on b.location_id=d.location_id where d.seller_id=p_seller),0),
 'reserved',coalesce((select sum(b.reserved_quantity) from arma_private.seller_deliveries d join public.inventory_balances b on b.location_id=d.location_id where d.seller_id=p_seller),0),
 'advances',coalesce((select sum(o.deposit) from arma_private.seller_deliveries d join arma_private.seller_order_links l on l.delivery_id=d.id join public.commerce_orders o on o.id=l.order_id where d.seller_id=p_seller and o.kind='reservation' and o.status='active'),0)) from sums cross join settled cross join purchases;
$function$;

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
  insert into arma_private.seller_deliveries(id,seller_id,product_variant_id,location_id,quantity,unit_price,notes,created_by,created_at,payment_terms) values(req,s,src.product_variant_id,loc,qty,price,coalesce(p_payload->>'notes',''),actor,now(),terms);
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
