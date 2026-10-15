-- Separate custody, selling price, and the seller's obligation to ARMA.
create table arma_private.seller_deliveries (
 id uuid primary key, seller_id uuid not null references public.profiles(id),
 product_variant_id uuid not null references public.product_variants(id),
 location_id uuid not null unique references public.inventory_locations(id),
 quantity integer not null check(quantity between 1 and 10000),
 unit_price numeric(12,2) not null check(unit_price>0 and unit_price<=999999),
 notes text not null default '', created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create index seller_deliveries_seller on arma_private.seller_deliveries(seller_id,created_at desc);
create index seller_deliveries_variant on arma_private.seller_deliveries(product_variant_id);
create table arma_private.seller_order_links (
 order_id uuid primary key references public.commerce_orders(id), delivery_id uuid not null references arma_private.seller_deliveries(id)
);
create index seller_order_links_delivery on arma_private.seller_order_links(delivery_id);
create table arma_private.seller_settlements (
 id uuid primary key,seller_id uuid not null references public.profiles(id),
 amount numeric(12,2) not null check(amount>0 and amount<=99999999),
 direction text not null check(direction in ('payment','refund')),
 method text not null check(method in ('cash','transfer','card')),
 reference text not null default '',created_by uuid not null references auth.users(id),created_at timestamptz not null default now()
);
create index seller_settlements_seller on arma_private.seller_settlements(seller_id,created_at desc);
create table arma_private.seller_stock_returns (
 id uuid primary key,delivery_id uuid not null references arma_private.seller_deliveries(id),quantity integer not null check(quantity>0),
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now()
);
create index seller_stock_returns_delivery on arma_private.seller_stock_returns(delivery_id);
alter table arma_private.seller_deliveries enable row level security;
alter table arma_private.seller_order_links enable row level security;
alter table arma_private.seller_settlements enable row level security;
alter table arma_private.seller_stock_returns enable row level security;
revoke all on arma_private.seller_deliveries,arma_private.seller_order_links,arma_private.seller_settlements,arma_private.seller_stock_returns from anon,authenticated;
create policy seller_deliveries_internal on arma_private.seller_deliveries using(false);
create policy seller_order_links_internal on arma_private.seller_order_links using(false);
create policy seller_settlements_internal on arma_private.seller_settlements using(false);
create policy seller_stock_returns_internal on arma_private.seller_stock_returns using(false);
insert into public.permissions(key,module,action,description) values
 ('consignments.read','consignments','read','Consultar entregas y liquidaciones propias'),
 ('consignments.manage','consignments','manage','Entregar mercancía y registrar pagos de vendedores'),
 ('inventory.sell_workshop','inventory','sell_workshop','Vender y apartar existencias del taller') on conflict(key) do nothing;
insert into public.role_permissions(role_id,permission_id) select r.id,p.id from public.roles r cross join public.permissions p where
 (r.code in ('owner','admin') and p.key in ('consignments.read','consignments.manage','inventory.sell_workshop')) or
 (r.code='seller' and p.key='consignments.read') on conflict do nothing;

create function arma_private.seller_totals(p_seller uuid) returns jsonb language sql stable set search_path='' as $$
with sales as (
 select d.unit_price,i.quantity,i.unit_price retail,coalesce(r.qty,0) returned,coalesce(r.refund,0) refund
 from arma_private.seller_deliveries d join arma_private.seller_order_links link on link.delivery_id=d.id
 join public.commerce_orders o on o.id=link.order_id and o.kind='sale'
 join public.commerce_order_items i on i.order_id=o.id
 left join lateral(select sum(quantity) qty,sum(refund) refund from arma_private.sale_returns where item_id=i.id) r on true
 where d.seller_id=p_seller
), sums as (select coalesce(sum((quantity-returned)*unit_price),0) owed,coalesce(sum(quantity*retail-refund),0) revenue,coalesce(sum(quantity-returned),0) pieces from sales),
settled as (select coalesce(sum(case when direction='payment' then amount else -amount end),0) paid from arma_private.seller_settlements where seller_id=p_seller)
select jsonb_build_object('due',owed-paid,'earned',revenue-owed,'revenue',revenue,'owed',owed,'paid',paid,'sold',pieces,
 'physical',coalesce((select sum(b.physical_quantity) from arma_private.seller_deliveries d join public.inventory_balances b on b.location_id=d.location_id where d.seller_id=p_seller),0),
 'reserved',coalesce((select sum(b.reserved_quantity) from arma_private.seller_deliveries d join public.inventory_balances b on b.location_id=d.location_id where d.seller_id=p_seller),0),
 'advances',coalesce((select sum(o.deposit) from arma_private.seller_deliveries d join arma_private.seller_order_links l on l.delivery_id=d.id join public.commerce_orders o on o.id=l.order_id where d.seller_id=p_seller and o.kind='reservation' and o.status='active'),0)) from sums cross join settled;
$$;
revoke all on function arma_private.seller_totals(uuid) from public,anon,authenticated;

create function arma_private.seller_overview(p_seller uuid default null,p_page int default 1) returns jsonb language plpgsql stable security definer set search_path='' as $$
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
 select d.id,d.created_at,jsonb_build_object('id',d.id,'created_at',d.created_at,'label',p.name||' · '||v.color||' · '||v.size,'product_id',p.id,'quantity',d.quantity,'unit_price',d.unit_price,'physical',b.physical_quantity,'reserved',b.reserved_quantity,'available',b.available_quantity,'returned',coalesce((select sum(quantity) from arma_private.seller_stock_returns where delivery_id=d.id),0),'notes',d.notes,'photo',arma_private.image_cover('product',p.id)) row
 from arma_private.seller_deliveries d join public.product_variants v on v.id=d.product_variant_id join public.products p on p.id=v.product_id join public.inventory_balances b on b.location_id=d.location_id where d.seller_id=s order by d.created_at desc,d.id limit 12 offset(p_page-1)*12) x),'[]'::jsonb),
 'payments_total',(select count(*) from arma_private.seller_settlements where seller_id=s),
 'payments',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id) from(select id,amount,direction,method,reference,created_at from arma_private.seller_settlements where seller_id=s order by created_at desc,id limit 12 offset(p_page-1)*12)x),'[]'::jsonb));
end;$$;
create function public.seller_overview(p_seller uuid default null,p_page int default 1) returns jsonb language sql security invoker set search_path='' as $$select arma_private.seller_overview(p_seller,p_page);$$;

create function arma_private.seller_write(p_payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();req uuid;action text;s uuid;qty int;price numeric;amt numeric;d arma_private.seller_deliveries;src public.inventory_balances;dst public.inventory_balances;loc uuid;j jsonb;begin
 if not public.has_commerce_permission('consignments.manage') then raise exception 'No tienes permiso para gestionar vendedores.' using errcode='42501';end if;
 req:=(p_payload->>'request_id')::uuid;action:=p_payload->>'action';s:=(p_payload->>'seller_id')::uuid;
 if req is null or s is null or action is null or action not in('deliver','return','payment','refund') then raise exception 'Solicitud inválida.';end if;
 perform pg_advisory_xact_lock(hashtextextended('seller:'||s::text,0));
 if exists(select 1 from arma_private.seller_deliveries where id=req and created_by=actor and seller_id=s) or exists(select 1 from arma_private.seller_settlements where id=req and created_by=actor and seller_id=s) or exists(select 1 from arma_private.seller_stock_returns r join arma_private.seller_deliveries d on d.id=r.delivery_id where r.id=req and r.created_by=actor and d.seller_id=s) then return req;end if;
 if not exists(select 1 from public.profiles where id=s) then raise exception 'Cuenta no encontrada.';end if;
 if action='deliver' then
  qty:=(p_payload->>'quantity')::int;price:=(p_payload->>'unit_price')::numeric;
  if qty is null or qty not between 1 and 10000 or price is null or price::text in('NaN','Infinity','-Infinity') or price<=0 or price>999999 or price<>round(price,2) or length(coalesce(p_payload->>'notes',''))>500 then raise exception 'Revisa cantidad, precio y notas.';end if;
  if not exists(select 1 from public.profiles where id=s and is_active) then raise exception 'El vendedor está deshabilitado.';end if;
  perform 1 from public.product_variants v join public.products p on p.id=v.product_id where v.id=(p_payload->>'variant_id')::uuid and v.is_active and p.is_active and v.currency='MXN' and upper(trim(v.size)) in('S','M','L') for share of v,p;
  if not found then raise exception 'Producto no disponible.';end if;
  select b.* into src from public.inventory_balances b join public.inventory_locations l on l.id=b.location_id and l.is_default and l.is_active where b.product_variant_id=(p_payload->>'variant_id')::uuid for update of b;
  if not found or src.available_quantity<qty then raise exception 'No hay suficientes piezas disponibles en el taller.';end if;
  loc:=gen_random_uuid();insert into public.inventory_locations(id,code,name) values(loc,'SELLER-'||req::text,'Entrega a vendedor');
  insert into arma_private.seller_deliveries values(req,s,src.product_variant_id,loc,qty,price,coalesce(p_payload->>'notes',''),actor,now());
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
  insert into arma_private.seller_settlements values(req,s,amt,action,p_payload->>'method',coalesce(p_payload->>'reference',''),actor,now());
 end if;
 return req;
end;$$;
create function public.seller_write(p_payload jsonb) returns uuid language sql security invoker set search_path='' as $$select arma_private.seller_write(p_payload);$$;
revoke all on function arma_private.seller_overview(uuid,int),public.seller_overview(uuid,int),arma_private.seller_write(jsonb),public.seller_write(jsonb) from public,anon;
grant execute on function arma_private.seller_overview(uuid,int),public.seller_overview(uuid,int),arma_private.seller_write(jsonb),public.seller_write(jsonb) to authenticated;

CREATE OR REPLACE FUNCTION arma_private.scoped_products_page(p_scope text,p_page integer DEFAULT 1,p_search text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  query_text text := lower(btrim(coalesce(p_search, '')));
  response jsonb;
begin
 if p_scope is null or p_scope not in('mine','warehouse','catalog') then raise exception 'Vista de inventario inválida.';end if;
 if p_scope='warehouse' and not public.has_commerce_permission('inventory.sell_workshop') then raise exception 'No tienes acceso a existencias del taller.' using errcode='42501';end if;
  if p_page is null or p_page < 1 or p_page > 1000000 then
    raise exception 'Número de página inválido.' using errcode = '22023';
  end if;
  if length(query_text) > 120 then
    raise exception 'La búsqueda no puede superar 120 caracteres.'
      using errcode = '22023';
  end if;
  if not public.can_read_products() then
    raise exception 'Tu cuenta no tiene permiso para consultar Productos.'
      using errcode = '42501';
  end if;

  with matched as materialized (
    select p.id, p.name, p.code, p.is_demo
    from public.products p
    where p.is_active = true
      and (p_scope<>'mine' or exists(select 1 from arma_private.seller_deliveries d join public.product_variants v on v.id=d.product_variant_id join public.inventory_balances b on b.location_id=d.location_id where v.product_id=p.id and d.seller_id=auth.uid() and b.physical_quantity>0))
      and (
        query_text = ''
        or strpos(lower(p.name), query_text) > 0
        or strpos(lower(p.code), query_text) > 0
        or exists (
          select 1 from public.product_variants v
          where v.product_id = p.id and v.is_active = true
            and (
              strpos(lower(v.sku), query_text) > 0
              or strpos(lower(v.size), query_text) > 0
              or strpos(lower(v.color), query_text) > 0
              or strpos(
                case upper(v.size)
                  when 'S' then 'chica chico'
                  when 'M' then 'mediana mediano'
                  when 'L' then 'grande'
                  else ''
                end,
                query_text
              ) > 0
            )
        )
      )
  ),
  stats as (
    select count(*) as total,
      least(
        p_page::bigint,
        greatest(1::bigint, (count(*) + 11) / 12)
      )::integer as page
    from matched
  ),
  page_rows as (
    select m.*
    from matched m
    order by m.name, m.id
    limit 12
    offset ((select page from stats) - 1) * 12
  ),
  items as (
    select
      p.id, p.name, p.code, p.is_demo,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'storage_bucket', i.storage_bucket,
            'storage_path', i.storage_path,
            'thumbnail_path',
              case when i.thumbnail_path is not null and exists (
                select 1 from storage.objects o
                where o.bucket_id = i.storage_bucket
                  and o.name = i.thumbnail_path
              ) then i.thumbnail_path else null end,
            'alt_text', i.alt_text
          )
        )
        from public.product_images i
        where i.product_id = p.id and i.is_cover = true and i.archived_at is null
      ), '[]'::jsonb) as product_images,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', v.id, 'sku', v.sku, 'size', v.size,
            'color', v.color, 'sale_price', v.sale_price,
            'currency', v.currency,
            'inventory_balances', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'physical_quantity', b.physical_quantity,
                  'reserved_quantity', b.reserved_quantity,
                  'available_quantity', b.available_quantity
                )
                order by b.location_id
              )
              from public.inventory_balances b
              where b.product_variant_id = v.id and ((p_scope='warehouse' and exists(select 1 from public.inventory_locations l where l.id=b.location_id and l.is_default and l.is_active)) or (p_scope='mine' and exists(select 1 from arma_private.seller_deliveries d where d.location_id=b.location_id and d.seller_id=auth.uid())))
            ), '[]'::jsonb)
          )
          order by v.color, v.size, v.sku
        )
        from public.product_variants v
        where v.product_id = p.id and v.is_active = true
      ), '[]'::jsonb) as product_variants
    from page_rows p
  )
  select jsonb_build_object(
    'page', (select page from stats),
    'page_size', 12,
    'total', (select total from stats),
    'items', coalesce((
      select jsonb_agg(to_jsonb(i) order by i.name, i.id) from items i
    ), '[]'::jsonb)
  ) into response;

  return response;
end;
$function$;

CREATE OR REPLACE FUNCTION arma_private.commerce_adjust(p_action text, p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare actor uuid:=auth.uid();req uuid;ord public.commerce_orders;item public.commerce_order_items;bal public.inventory_balances;amount numeric;qty int;method text;returned int;refunded numeric;restock boolean;
begin
 if actor is null or p_action is null or p_action not in('payment','return') or not public.has_commerce_permission(case when p_action='payment' then 'reservations.payments' else 'sales.returns' end) then raise exception 'No tienes permiso para esta operación.' using errcode='42501';end if;
 req:=(p_payload->>'request_id')::uuid;if req is null then raise exception 'Falta identificador.';end if;perform pg_advisory_xact_lock(hashtextextended(req::text,0));
 perform pg_advisory_xact_lock(hashtextextended('seller:'||d.seller_id::text,0)) from arma_private.seller_deliveries d join arma_private.seller_order_links l on l.delivery_id=d.id where l.order_id=(p_payload->>'order_id')::uuid;
 select * into ord from public.commerce_orders where id=(p_payload->>'order_id')::uuid for update;
 if not found or (ord.created_by<>actor and not public.has_commerce_permission('commerce.manage_all')) then raise exception 'Registro no disponible.' using errcode='42501';end if;
 if exists(select 1 from arma_private.commerce_payments where id=req and order_id=ord.id and created_by=actor) or exists(select 1 from arma_private.sale_returns where id=req and order_id=ord.id and created_by=actor) then return req;end if;
 amount:=(p_payload->>'amount')::numeric;method:=p_payload->>'method';
 if amount is null or amount::text in('NaN','Infinity','-Infinity') or amount<0 or amount>99999999 or amount<>round(amount,2) or method is null or method not in('cash','transfer','card') then raise exception 'Revisa importe y medio de pago.';end if;
 if p_action='payment' then
  if ord.kind<>'reservation' or ord.status<>'active' or amount<=0 or amount>ord.total-ord.deposit then raise exception 'El abono debe ser mayor que cero y no superar el saldo pendiente.';end if;
  insert into arma_private.commerce_payments(id,order_id,amount,method,kind,created_by) values(req,ord.id,amount,method,'payment',actor);
  update public.commerce_orders set deposit=deposit+amount,payment_method=coalesce(payment_method,method) where id=ord.id;
 else
  if ord.kind<>'sale' then raise exception 'Solo puedes devolver productos de una venta.';end if;
  select * into item from public.commerce_order_items where id=(p_payload->>'item_id')::uuid and order_id=ord.id;
  if not found then raise exception 'La pieza no pertenece a la venta.';end if;
  qty:=(p_payload->>'quantity')::int;restock:=(p_payload->>'restock')::boolean;
  select coalesce(sum(quantity),0),coalesce(sum(refund),0) into returned,refunded from arma_private.sale_returns where item_id=item.id;
  if qty is null or qty<1 or qty>item.quantity-returned or restock is null or amount>qty*item.unit_price or amount>item.quantity*item.unit_price-refunded or length(trim(coalesce(p_payload->>'reason',''))) not between 3 and 500 then raise exception 'Revisa cantidad, reembolso y motivo de devolución.';end if;
  insert into arma_private.sale_returns values(req,ord.id,item.id,qty,restock,amount,method,p_payload->>'reason',actor,now());
  if amount>0 then insert into arma_private.commerce_payments(id,order_id,amount,method,kind,created_by,reference) values(req,ord.id,-amount,method,'return',actor,p_payload->>'reason');end if;
  if restock then
   select * into bal from public.inventory_balances where id=item.inventory_balance_id for update;
   update public.inventory_balances set physical_quantity=physical_quantity+qty,average_unit_cost=case when bal.physical_quantity=0 then item.unit_cost when bal.average_unit_cost is null or item.unit_cost is null then null else round((bal.physical_quantity*bal.average_unit_cost+qty*item.unit_cost)/(bal.physical_quantity+qty),4) end,updated_at=now() where id=bal.id;
   insert into public.inventory_movements(inventory_balance_id,movement_type,physical_delta,unit_cost,reason,created_by,commerce_order_id) values(bal.id,'entry',qty,item.unit_cost,'Devolución de venta · '||req::text,actor,ord.id);
  end if;
 end if;
 return req;
end $function$;

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
 insert into public.commerce_orders(id,kind,status,customer_name,customer_phone,notes,total,deposit,payment_method,due_date,delivery_date,created_by,seller_name)
 values(v_id,v_kind,case when v_kind='sale' then 'completed' else 'active' end,v_name,v_phone,v_notes,v_price*v_quantity,v_deposit,v_method,v_date,v_delivery,v_actor,coalesce(v_seller,'Personal ARMA'));
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
 select * into v_order from public.commerce_orders where id=p_id and kind='reservation' for update;
 if not found or (v_order.created_by<>v_actor and not public.has_commerce_permission('commerce.manage_all')) then raise exception 'Apartado no encontrado.'; end if;
 select delivery_id into v_delivery from arma_private.seller_order_links where order_id=p_id;
 if v_delivery is not null then perform pg_advisory_xact_lock(hashtextextended('seller:'||v_order.created_by::text,0));end if;
 if v_order.status='fulfilled' and p_action='complete' then return v_order.sale_id; end if;
 if v_order.status='cancelled' and p_action='cancel' then return v_order.id; end if;
 if v_order.status<>'active' then raise exception 'Este apartado ya fue cerrado. Actualiza el listado.'; end if;
 if p_action='complete' and (p_request_id is null or p_payment_method is null or p_payment_method not in ('cash','transfer','card')) then raise exception 'Selecciona la forma de pago del saldo.'; end if;
 if p_action='cancel' and v_order.deposit>0 and not coalesce(p_refund_confirmed,false) then raise exception 'Confirma la devolución del anticipo antes de cancelar.'; end if;
 if p_action='complete' then
  select full_name into v_seller from public.profiles where id=v_actor;
  insert into public.commerce_orders(id,kind,status,customer_name,customer_phone,notes,total,deposit,payment_method,created_by,seller_name,source_reservation_id,applied_deposit)
  values(p_request_id,'sale','completed',v_order.customer_name,v_order.customer_phone,v_order.notes,v_order.total,0,p_payment_method,case when v_delivery is not null then v_order.created_by else v_actor end,case when v_delivery is not null then v_order.seller_name else coalesce(v_seller,'Personal ARMA') end,p_id,v_order.deposit);
 if v_delivery is not null then insert into arma_private.seller_order_links values(p_request_id,v_delivery);end if;
 end if;
 for v_item in select * from public.commerce_order_items where order_id=p_id order by inventory_balance_id loop
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
create function public.scoped_products_page(p_scope text,p_page int default 1,p_search text default '') returns jsonb language sql security invoker set search_path='' as $$select arma_private.scoped_products_page(p_scope,p_page,p_search);$$;
create function arma_private.scoped_product_detail(p_id uuid,p_scope text) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.can_read_products() then raise exception 'No tienes acceso a Productos.' using errcode='42501';end if;
 if p_scope is null or p_scope not in('mine','warehouse','catalog') then raise exception 'Vista inválida.';end if;
 if p_scope='warehouse' and not public.has_commerce_permission('inventory.sell_workshop') then raise exception 'No tienes acceso al taller.' using errcode='42501';end if;
 return (select jsonb_build_object('id',p.id,'name',p.name,'code',p.code,'description',p.description,'is_demo',p.is_demo,
 'product_images',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'storage_bucket',i.storage_bucket,'storage_path',i.storage_path,'alt_text',i.alt_text,'caption',i.caption,'sort_order',i.sort_order,'is_cover',i.is_cover,'background_color',i.background_color) order by i.is_cover desc,i.sort_order) from public.product_images i where i.product_id=p.id and i.archived_at is null),'[]'::jsonb),
 'product_variants',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'sku',v.sku,'size',v.size,'color',v.color,'sale_price',v.sale_price,'currency',v.currency,
 'inventory_balances',coalesce((select jsonb_agg(jsonb_build_object('physical_quantity',b.physical_quantity,'reserved_quantity',b.reserved_quantity,'available_quantity',b.available_quantity)) from public.inventory_balances b where b.product_variant_id=v.id and ((p_scope='warehouse' and exists(select 1 from public.inventory_locations l where l.id=b.location_id and l.is_default and l.is_active)) or (p_scope='mine' and exists(select 1 from arma_private.seller_deliveries d where d.location_id=b.location_id and d.seller_id=auth.uid())))),'[]'::jsonb),
 'consignment_lots',case when p_scope='mine' then coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'unit_price',d.unit_price,'available',b.available_quantity,'created_at',d.created_at) order by d.created_at,d.id) from arma_private.seller_deliveries d join public.inventory_balances b on b.location_id=d.location_id where d.product_variant_id=v.id and d.seller_id=auth.uid() and b.available_quantity>0),'[]'::jsonb) else '[]'::jsonb end) order by v.color,v.size) from public.product_variants v where v.product_id=p.id and v.is_active),'[]'::jsonb)) from public.products p where p.id=p_id and p.is_active);
end;$$;
create function public.scoped_product_detail(p_id uuid,p_scope text) returns jsonb language sql security invoker set search_path='' as $$select arma_private.scoped_product_detail(p_id,p_scope);$$;
revoke all on function public.scoped_products_page(text,int,text),arma_private.scoped_products_page(text,int,text),public.scoped_product_detail(uuid,text),arma_private.scoped_product_detail(uuid,text) from public,anon;
grant execute on function public.scoped_products_page(text,int,text),arma_private.scoped_products_page(text,int,text),public.scoped_product_detail(uuid,text),arma_private.scoped_product_detail(uuid,text) to authenticated;
