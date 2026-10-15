-- Business operations. Historic unknown costs remain NULL, never zero by assumption.
alter table public.inventory_balances add column average_unit_cost numeric(16,4) check(average_unit_cost>=0);
alter table public.commerce_order_items add column unit_cost numeric(16,4) check(unit_cost>=0);
alter table public.production_orders add column planned_quantity integer check(planned_quantity between 1 and 10000), add column actual_quantity integer check(actual_quantity between 0 and 10000), add column product_variant_id uuid references public.product_variants(id), add column labor_cost numeric(12,2), add column target_margin numeric(5,2), add column unit_cost numeric(16,4);
alter table public.production_inputs add column per_unit integer check(per_unit between 1 and 1000), add column unit_cost numeric(16,4);
create index production_variant_idx on public.production_orders(product_variant_id);
create index production_created_by_idx on public.production_orders(created_by);
create index production_location_idx on public.production_orders(location_id);

create table arma_private.material_receipts(id uuid primary key, material_variant_id uuid not null references public.material_variants(id), quantity integer not null check(quantity between 1 and 100000), unit_cost numeric(12,2) not null check(unit_cost>=0), supplier text not null default '', reference text not null default '', created_by uuid not null references auth.users(id), created_at timestamptz not null default now());
create table arma_private.cost_valuations(id uuid primary key, inventory_balance_id uuid not null references public.inventory_balances(id), previous_cost numeric, unit_cost numeric not null check(unit_cost>=0), reason text not null, created_by uuid not null references auth.users(id), created_at timestamptz not null default now());
create table arma_private.product_recipes(product_variant_id uuid primary key references public.product_variants(id), labor_cost numeric(12,2) not null check(labor_cost>=0), target_margin numeric(5,2) not null check(target_margin>=0 and target_margin<100), updated_by uuid not null references auth.users(id), updated_at timestamptz not null default now());
create table arma_private.recipe_materials(product_variant_id uuid not null references arma_private.product_recipes(product_variant_id), material_variant_id uuid not null references public.material_variants(id), quantity integer not null check(quantity between 1 and 1000), primary key(product_variant_id,material_variant_id));
create table arma_private.commerce_payments(id uuid primary key default gen_random_uuid(), order_id uuid not null references public.commerce_orders(id), amount numeric(14,2) not null check(amount<>0), method text not null check(method in('cash','transfer','card')), kind text not null check(kind in('sale','deposit','payment','cancellation','return')), created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), reference text not null default '');
create index commerce_payments_order_idx on arma_private.commerce_payments(order_id);
create index commerce_payments_created_idx on arma_private.commerce_payments(created_at);
create table arma_private.sale_returns(id uuid primary key, order_id uuid not null references public.commerce_orders(id), item_id uuid not null references public.commerce_order_items(id), quantity integer not null check(quantity between 1 and 10000), restock boolean not null, refund numeric(14,2) not null check(refund>=0), method text not null check(method in('cash','transfer','card')), reason text not null check(length(trim(reason)) between 3 and 500), created_by uuid not null references auth.users(id), created_at timestamptz not null default now());
create index sale_returns_item_idx on arma_private.sale_returns(item_id);
create index sale_returns_order_idx on arma_private.sale_returns(order_id);
do $$declare t text;begin foreach t in array array['material_receipts','cost_valuations','product_recipes','recipe_materials','commerce_payments','sale_returns'] loop execute format('alter table arma_private.%I enable row level security',t);execute format('revoke all on arma_private.%I from public,anon,authenticated',t);end loop;end $$;

with added as(insert into public.permissions(key,module,action,description) values
('materials.receive','materials','receive','Registrar entradas y valorar existencias'),
('production.read','production','read','Consultar armado de productos y recetas'),
('production.recipes','production','recipes','Guardar recetas y costos de mano de obra'),
('production.create','production','create','Iniciar órdenes de armado'),
('production.complete','production','complete','Finalizar órdenes de armado'),
('production.cancel','production','cancel','Cancelar órdenes de armado'),
('reservations.payments','reservations','payments','Registrar abonos adicionales'),
('sales.returns','sales','returns','Registrar devoluciones y reembolsos'),
('business.read','business','read','Consultar costos y precios sugeridos en Inicio') returning id,key)
insert into public.role_permissions(role_id,permission_id) select r.id,p.id from added p cross join public.roles r where r.code in('admin','owner') or (r.code='seller' and p.key='reservations.payments');

-- Backfill actual historical receipts once, without double-counting converted reservations.
insert into arma_private.commerce_payments(order_id,amount,method,kind,created_by,created_at,reference)
select id,case when kind='sale' then total-applied_deposit else deposit end,payment_method,case when kind='sale' then 'sale' else 'deposit' end,created_by,created_at,'Registro anterior a libro de cobros'
from public.commerce_orders where (kind='sale' and total>applied_deposit) or (kind='reservation' and deposit>0);
insert into arma_private.commerce_payments(order_id,amount,method,kind,created_by,created_at,reference)
select id,-refunded_amount,payment_method,'cancellation',coalesce(closed_by,created_by),coalesce(closed_at,created_at),'Cancelación histórica' from public.commerce_orders where kind='reservation' and refunded_amount>0;

create function arma_private.capture_order_money() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' then
  if (new.kind='sale' and new.total>new.applied_deposit) or (new.kind='reservation' and new.deposit>0) then
   insert into arma_private.commerce_payments(order_id,amount,method,kind,created_by) values(new.id,case when new.kind='sale' then new.total-new.applied_deposit else new.deposit end,new.payment_method,case when new.kind='sale' then 'sale' else 'deposit' end,new.created_by);
  end if;
 elsif new.status='cancelled' and old.status<>'cancelled' then
  insert into arma_private.commerce_payments(order_id,amount,method,kind,created_by,reference)
  select new.id,-sum(amount),method,'cancellation',coalesce(new.closed_by,new.created_by),'Devolución por el medio original' from arma_private.commerce_payments where order_id=new.id group by method having sum(amount)>0;
 end if;
 return new;
end $$;
create trigger order_money after insert or update of status on public.commerce_orders for each row execute function arma_private.capture_order_money();
create function arma_private.capture_sale_cost() returns trigger language plpgsql security definer set search_path='' as $$begin
 select b.average_unit_cost into new.unit_cost from public.inventory_balances b where b.id=new.inventory_balance_id;
 return new;end $$;
create trigger item_cost before insert on public.commerce_order_items for each row execute function arma_private.capture_sale_cost();

create function arma_private.workshop_write(p_action text,p_payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();req uuid;variant uuid;qty integer;cost numeric;labor numeric;margin numeric;line jsonb;bal public.inventory_balances;ord public.production_orders;rec arma_private.product_recipes;loc uuid;total_cost numeric;missing boolean;inp record;result uuid;perm text;
begin
 perm:=case p_action when 'receive' then 'materials.receive' when 'value' then 'materials.receive' when 'recipe' then 'production.recipes' when 'start' then 'production.create' when 'finish' then 'production.complete' when 'cancel' then 'production.cancel' end;
 if actor is null or perm is null or not public.has_commerce_permission(perm) then raise exception 'No tienes permiso para esta operación.' using errcode='42501';end if;
 req:=(p_payload->>'request_id')::uuid;if req is null then raise exception 'Falta identificador.';end if;
 perform pg_advisory_xact_lock(hashtextextended(req::text,0));
 variant:=(p_payload->>'variant_id')::uuid;
 select id into loc from public.inventory_locations where is_default and is_active;if loc is null then raise exception 'Falta la ubicación principal.';end if;
 if p_action in('receive','value') then
  if exists(select 1 from arma_private.material_receipts where id=req and created_by=actor) or exists(select 1 from arma_private.cost_valuations where id=req and created_by=actor) then return req;end if;
  if not exists(select 1 from public.material_variants v join public.materials m on m.id=v.material_id where v.id=variant and v.is_active and m.is_active) then raise exception 'El insumo no está activo.';end if;
  cost:=(p_payload->>'unit_cost')::numeric;
  if cost is null or cost::text in('NaN','Infinity','-Infinity') or cost<0 or cost>999999 or cost<>round(cost,2) then raise exception 'Costo inválido.';end if;
  insert into public.inventory_balances(location_id,material_variant_id) values(loc,variant) on conflict do nothing;
  select * into bal from public.inventory_balances where location_id=loc and material_variant_id=variant for update;
  if p_action='value' then
   if length(trim(coalesce(p_payload->>'reason',''))) not between 3 and 500 then raise exception 'Indica el motivo de la valoración.';end if;
   insert into arma_private.cost_valuations values(req,bal.id,bal.average_unit_cost,cost,p_payload->>'reason',actor,now());
   update public.inventory_balances set average_unit_cost=cost,updated_at=now() where id=bal.id;
  else
   qty:=(p_payload->>'quantity')::int;if qty is null or qty not between 1 and 100000 or length(coalesce(p_payload->>'supplier',''))>120 or length(coalesce(p_payload->>'reference',''))>200 then raise exception 'Revisa cantidad, proveedor y referencia.';end if;
   insert into arma_private.material_receipts values(req,variant,qty,cost,coalesce(p_payload->>'supplier',''),coalesce(p_payload->>'reference',''),actor,now());
   update public.inventory_balances set physical_quantity=physical_quantity+qty,average_unit_cost=case when bal.physical_quantity=0 then cost when bal.average_unit_cost is null then null else round((bal.physical_quantity*bal.average_unit_cost+qty*cost)/(bal.physical_quantity+qty),4) end,updated_at=now() where id=bal.id;
   insert into public.inventory_movements(inventory_balance_id,movement_type,physical_delta,unit_cost,reason,created_by) values(bal.id,'entry',qty,cost,'Entrada de materia prima · '||req::text,actor);
  end if;
 elsif p_action='recipe' then
  if not exists(select 1 from public.product_variants v join public.products p on p.id=v.product_id where v.id=variant and v.is_active and p.is_active and upper(v.size) in('S','M','L')) then raise exception 'Selecciona una variante activa S, M o L.';end if;
  labor:=(p_payload->>'labor_cost')::numeric;margin:=(p_payload->>'target_margin')::numeric;
  if labor is null or margin is null or labor::text in('NaN','Infinity','-Infinity') or margin::text in('NaN','Infinity','-Infinity') or labor<0 or labor>999999 or labor<>round(labor,2) or margin<0 or margin>=100 or margin<>round(margin,2) then raise exception 'Revisa mano de obra y margen.';end if;
  if jsonb_typeof(p_payload->'lines') is distinct from 'array' or jsonb_array_length(p_payload->'lines') not between 1 and 30 then raise exception 'Agrega entre 1 y 30 insumos.';end if;
  perform pg_advisory_xact_lock(hashtextextended(variant::text,1));
  insert into arma_private.product_recipes values(variant,labor,margin,actor,now()) on conflict(product_variant_id) do update set labor_cost=excluded.labor_cost,target_margin=excluded.target_margin,updated_by=actor,updated_at=now();
  delete from arma_private.recipe_materials where product_variant_id=variant;
  for line in select * from jsonb_array_elements(p_payload->'lines') loop
   if not exists(select 1 from public.material_variants v join public.materials m on m.id=v.material_id where v.id=(line->>'material_variant_id')::uuid and v.is_active and m.is_active) then raise exception 'Un insumo ya no está activo.';end if;
   qty:=(line->>'quantity')::int;if qty is null or qty not between 1 and 1000 then raise exception 'Cantidad de receta inválida.';end if;
   insert into arma_private.recipe_materials values(variant,(line->>'material_variant_id')::uuid,qty);
  end loop;
  -- Exactly one blank shirt per finished garment; one or more DTF designs.
  if (select coalesce(sum(r.quantity),0) from arma_private.recipe_materials r join public.material_variants v on v.id=r.material_variant_id join public.materials m on m.id=v.material_id where r.product_variant_id=variant and m.material_type='blank_shirt')<>1 or not exists(select 1 from arma_private.recipe_materials r join public.material_variants v on v.id=r.material_variant_id join public.materials m on m.id=v.material_id where r.product_variant_id=variant and m.material_type='dtf_transfer') then raise exception 'La receta debe llevar una playera sin imprimir y al menos un DTF.';end if;
  return variant;
 elsif p_action='start' then
  select * into ord from public.production_orders where id=req;if found then if ord.created_by<>actor then raise exception 'Operación no disponible.';end if;return req;end if;
  qty:=(p_payload->>'quantity')::int;if qty is null or qty not between 1 and 10000 or length(coalesce(p_payload->>'notes',''))>1000 then raise exception 'Cantidad o notas inválidas.';end if;
  perform pg_advisory_xact_lock(hashtextextended(variant::text,1));
  select * into rec from arma_private.product_recipes where product_variant_id=variant;if not found then raise exception 'Guarda primero la receta de esta variante.';end if;
  if not exists(select 1 from public.product_variants v join public.products p on p.id=v.product_id where v.id=variant and v.is_active and p.is_active) then raise exception 'Producto inactivo.';end if;
  insert into public.production_orders(id,location_id,status,notes,created_by,planned_quantity,product_variant_id,labor_cost,target_margin) values(req,loc,'draft',coalesce(p_payload->>'notes',''),actor,qty,variant,rec.labor_cost,rec.target_margin);
  for inp in select r.*,v.is_active,m.is_active parent_active from arma_private.recipe_materials r join public.material_variants v on v.id=r.material_variant_id join public.materials m on m.id=v.material_id where r.product_variant_id=variant order by r.material_variant_id loop
   if not inp.is_active or not inp.parent_active then raise exception 'La receta contiene un insumo oculto. Actualízala.';end if;
   select * into bal from public.inventory_balances where location_id=loc and material_variant_id=inp.material_variant_id for update;
   if not found or bal.available_quantity<inp.quantity*qty then raise exception 'Materia prima insuficiente. Revisa las cantidades disponibles.';end if;
   update public.inventory_balances set reserved_quantity=reserved_quantity+inp.quantity*qty,updated_at=now() where id=bal.id;
   insert into public.production_inputs(production_order_id,material_variant_id,quantity,per_unit,unit_cost) values(req,inp.material_variant_id,inp.quantity*qty,inp.quantity,bal.average_unit_cost);
   insert into public.inventory_movements(inventory_balance_id,movement_type,reserved_delta,production_order_id,reason,created_by) values(bal.id,'reservation',inp.quantity*qty,req,'Insumos reservados para armado',actor);
  end loop;
 else
  select * into ord from public.production_orders where id=(p_payload->>'order_id')::uuid for update;
  if not found or ord.planned_quantity is null then raise exception 'Orden no encontrada.';end if;
  if ord.status<>'draft' then if (ord.status='completed' and p_action='finish') or (ord.status='cancelled' and p_action='cancel') then return ord.id;end if;raise exception 'La orden ya está cerrada.';end if;
  qty:=case when p_action='cancel' then 0 else (p_payload->>'quantity')::int end;
  if qty is null or qty not between 0 and ord.planned_quantity then raise exception 'La cantidad terminada debe estar entre cero y la planeada.';end if;
  total_cost:=ord.labor_cost;missing:=false;
  for inp in select * from public.production_inputs where production_order_id=ord.id order by material_variant_id loop
   select * into bal from public.inventory_balances where location_id=ord.location_id and material_variant_id=inp.material_variant_id for update;
   if not found or bal.reserved_quantity<inp.quantity or bal.physical_quantity<inp.per_unit*qty then raise exception 'Inventario inconsistente. Revisa la orden.';end if;
   -- Consume at the current weighted average; the order retains the definitive cost snapshot.
   update public.production_inputs set unit_cost=bal.average_unit_cost where id=inp.id;
   missing:=missing or bal.average_unit_cost is null;total_cost:=total_cost+coalesce(bal.average_unit_cost,0)*inp.per_unit;
   update public.inventory_balances set physical_quantity=physical_quantity-inp.per_unit*qty,reserved_quantity=reserved_quantity-inp.quantity,updated_at=now() where id=bal.id;
   insert into public.inventory_movements(inventory_balance_id,movement_type,physical_delta,reserved_delta,unit_cost,production_order_id,reason,created_by) values(bal.id,case when qty>0 then 'production_input' else 'reservation_release' end,-inp.per_unit*qty,-inp.quantity,bal.average_unit_cost,ord.id,'Cierre de armado; insumos no utilizados liberados',actor);
  end loop;
  if missing then total_cost:=null;end if;
  if qty>0 then
   insert into public.inventory_balances(location_id,product_variant_id) values(ord.location_id,ord.product_variant_id) on conflict do nothing;
   select * into bal from public.inventory_balances where location_id=ord.location_id and product_variant_id=ord.product_variant_id for update;
   update public.inventory_balances set physical_quantity=physical_quantity+qty,average_unit_cost=case when bal.physical_quantity=0 then total_cost when total_cost is null or bal.average_unit_cost is null then null else round((bal.physical_quantity*bal.average_unit_cost+qty*total_cost)/(bal.physical_quantity+qty),4) end,updated_at=now() where id=bal.id;
   insert into public.production_outputs values(ord.id,ord.product_variant_id,qty);
   insert into public.inventory_movements(inventory_balance_id,movement_type,physical_delta,unit_cost,production_order_id,reason,created_by) values(bal.id,'production_output',qty,total_cost,ord.id,'Producto terminado',actor);
  end if;
  update public.production_orders set status=case when p_action='cancel' then 'cancelled' else 'completed' end,actual_quantity=qty,unit_cost=total_cost,completed_by=case when p_action='finish' then actor end,completed_at=case when p_action='finish' then now() end,updated_at=now() where id=ord.id;
  return ord.id;
 end if;
 return req;
end $$;
create function arma_private.commerce_adjust(p_action text,p_payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();req uuid;ord public.commerce_orders;item public.commerce_order_items;bal public.inventory_balances;amount numeric;qty int;method text;returned int;refunded numeric;restock boolean;
begin
 if actor is null or p_action is null or p_action not in('payment','return') or not public.has_commerce_permission(case when p_action='payment' then 'reservations.payments' else 'sales.returns' end) then raise exception 'No tienes permiso para esta operación.' using errcode='42501';end if;
 req:=(p_payload->>'request_id')::uuid;if req is null then raise exception 'Falta identificador.';end if;perform pg_advisory_xact_lock(hashtextextended(req::text,0));
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
end $$;

create function arma_private.commerce_history(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ord public.commerce_orders;begin
 select * into ord from public.commerce_orders where id=p_id;
 if not found or not public.has_commerce_permission(case when ord.kind='sale' then 'sales.read' else 'reservations.read' end) or (ord.created_by<>auth.uid() and not public.has_commerce_permission('commerce.read_all')) then raise exception 'No tienes acceso a este registro.' using errcode='42501';end if;
 return jsonb_build_object('payments',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from arma_private.commerce_payments p where p.order_id=p_id),'[]'::jsonb),'returns',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from arma_private.sale_returns r where r.order_id=p_id),'[]'::jsonb));
end $$;

create function arma_private.workshop_options(p_kind text,p_search text default '',p_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare j jsonb;begin
 if not public.has_commerce_permission(case when p_kind='material' then 'materials.read' else 'production.read' end) then raise exception 'Sin acceso a estas variantes.' using errcode='42501';end if;
 if p_kind is null or p_kind not in('material','product') or p_search is null or length(p_search)>120 then raise exception 'Filtro inválido.';end if;
 if p_kind='material' then
 select coalesce(jsonb_agg(x order by x.label),'[]') into j from(select v.id,m.name||' · '||v.sku||coalesce(' · '||v.size,'')||coalesce(' · '||v.color,'') label,coalesce(v.description,m.description,'') description,m.material_type type,coalesce(b.available_quantity,0) available,b.average_unit_cost cost from public.material_variants v join public.materials m on m.id=v.material_id left join public.inventory_balances b on b.material_variant_id=v.id and b.location_id=(select id from public.inventory_locations where is_default and is_active) where v.is_active and m.is_active and (p_id is null or v.id=p_id) and (p_search='' or strpos(lower(m.name||' '||v.sku||' '||coalesce(v.description,'')||' '||coalesce(v.size,'')||' '||coalesce(v.color,'')),lower(trim(p_search)))>0) order by m.name,v.sku limit 100)x;
 else
 select coalesce(jsonb_agg(x order by x.label),'[]') into j from(select v.id,p.name||' · '||v.size||' · '||v.color||' · '||v.sku label,coalesce(v.description,p.description,'') description,'product'::text type,coalesce(b.available_quantity,0) available,b.average_unit_cost cost from public.product_variants v join public.products p on p.id=v.product_id left join public.inventory_balances b on b.product_variant_id=v.id and b.location_id=(select id from public.inventory_locations where is_default and is_active) where v.is_active and p.is_active and upper(v.size) in('S','M','L') and (p_id is null or v.id=p_id) and (p_search='' or strpos(lower(p.name||' '||v.sku||' '||v.size||' '||v.color),lower(trim(p_search)))>0) order by p.name,v.sku limit 100)x;
 end if;return j;end $$;

create function arma_private.workshop_recipe(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not public.has_commerce_permission('production.read') then raise exception 'Sin acceso a recetas.' using errcode='42501';end if;
 return jsonb_build_object('recipe',(select to_jsonb(r) from arma_private.product_recipes r where r.product_variant_id=p_id),'lines',coalesce((select jsonb_agg(jsonb_build_object('material_variant_id',r.material_variant_id,'quantity',r.quantity,'label',m.name||' · '||v.sku,'description',coalesce(v.description,m.description,''),'available',coalesce(b.available_quantity,0),'cost',b.average_unit_cost,'active',v.is_active and m.is_active) order by m.material_type,v.sku) from arma_private.recipe_materials r join public.material_variants v on v.id=r.material_variant_id join public.materials m on m.id=v.material_id left join public.inventory_balances b on b.material_variant_id=v.id and b.location_id=(select id from public.inventory_locations where is_default and is_active) where r.product_variant_id=p_id),'[]'::jsonb));end $$;

create function arma_private.workshop_history(p_kind text,p_page integer default 1) returns jsonb language plpgsql stable security definer set search_path='' as $$declare j jsonb;begin
 if not public.has_commerce_permission(case when p_kind='receipts' then 'materials.read' else 'production.read' end) then raise exception 'No tienes acceso.' using errcode='42501';end if;
 if p_kind is null or p_kind not in('receipts','production') or p_page is null or p_page not between 1 and 1000000 then raise exception 'Filtro inválido.';end if;
 if p_kind='receipts' then
 select jsonb_build_object('total',(select count(*) from arma_private.material_receipts),'items',coalesce(jsonb_agg(x order by x.created_at desc),'[]')) into j from(select r.id,r.created_at,r.quantity,r.unit_cost,r.supplier,r.reference,m.name||' · '||v.sku label from arma_private.material_receipts r join public.material_variants v on v.id=r.material_variant_id join public.materials m on m.id=v.material_id order by r.created_at desc,r.id limit 20 offset(p_page-1)*20)x;
 else
 select jsonb_build_object('total',(select count(*) from public.production_orders where planned_quantity is not null),'items',coalesce(jsonb_agg(x order by x.created_at desc),'[]')) into j from(select o.*,p.name||' · '||v.size||' · '||v.color label,coalesce((select jsonb_agg(jsonb_build_object('label',m.name||' · '||mv.sku,'description',coalesce(mv.description,m.description,''),'quantity',i.quantity,'per_unit',i.per_unit,'unit_cost',i.unit_cost)) from public.production_inputs i join public.material_variants mv on mv.id=i.material_variant_id join public.materials m on m.id=mv.material_id where i.production_order_id=o.id),'[]') inputs from public.production_orders o join public.product_variants v on v.id=o.product_variant_id join public.products p on p.id=v.product_id where o.planned_quantity is not null order by o.created_at desc,o.id limit 20 offset(p_page-1)*20)x;
 end if;return j;end $$;
create function arma_private.business_dashboard(p_from date,p_to date) returns jsonb language plpgsql stable security definer set search_path='' as $$
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
 'available',case when public.has_commerce_permission('products.read') then (select coalesce(sum(b.available_quantity),0) from public.inventory_balances b join public.product_variants v on v.id=b.product_variant_id join public.products p on p.id=v.product_id where v.is_active and p.is_active and upper(v.size) in('S','M','L')) else null end,
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
 r.labor_cost,r.target_margin,
 case when r.product_variant_id is not null and not exists(select 1 from arma_private.recipe_materials rm left join public.inventory_balances b on b.material_variant_id=rm.material_variant_id and b.location_id=(select id from public.inventory_locations where is_default and is_active) where rm.product_variant_id=v.id and b.average_unit_cost is null) then r.labor_cost+(select sum(rm.quantity*b.average_unit_cost) from arma_private.recipe_materials rm join public.inventory_balances b on b.material_variant_id=rm.material_variant_id and b.location_id=(select id from public.inventory_locations where is_default and is_active) where rm.product_variant_id=v.id) else null end cost
 from public.product_variants v join public.products p on p.id=v.product_id left join arma_private.product_recipes r on r.product_variant_id=v.id where v.is_active and p.is_active and upper(v.size) in('S','M','L') order by p.name,v.size limit 100)x),'[]') else '[]'::jsonb end,
 'stock_alerts',coalesce((select jsonb_agg(x order by x.available) from(
 select m.name||' · '||v.sku label,b.available_quantity available,'material'::text kind from public.inventory_balances b join public.material_variants v on v.id=b.material_variant_id join public.materials m on m.id=v.material_id where public.has_commerce_permission('materials.read') and v.is_active and m.is_active and b.available_quantity<=greatest(v.minimum_stock,5)
 union all select p.name||' · '||v.size||' · '||v.color,b.available_quantity,'product' from public.inventory_balances b join public.product_variants v on v.id=b.product_variant_id join public.products p on p.id=v.product_id where public.has_commerce_permission('products.read') and v.is_active and p.is_active and upper(v.size) in('S','M','L') and b.available_quantity<=greatest(v.minimum_stock,5)
 order by available limit 12)x),'[]')) into j;
 return j;
end $$;

create function public.workshop_write(p_action text,p_payload jsonb) returns uuid language sql set search_path='' as $$select arma_private.workshop_write(p_action,p_payload);$$;
revoke all on function public.workshop_write(text,jsonb) from public,anon;
grant execute on function public.workshop_write(text,jsonb) to authenticated;
revoke all on function arma_private.workshop_write(text,jsonb) from public,anon;
grant execute on function arma_private.workshop_write(text,jsonb) to authenticated;

create function public.commerce_adjust(p_action text,p_payload jsonb) returns uuid language sql set search_path='' as $$select arma_private.commerce_adjust(p_action,p_payload);$$;
revoke all on function public.commerce_adjust(text,jsonb) from public,anon;
grant execute on function public.commerce_adjust(text,jsonb) to authenticated;
revoke all on function arma_private.commerce_adjust(text,jsonb) from public,anon;
grant execute on function arma_private.commerce_adjust(text,jsonb) to authenticated;

create function public.commerce_history(p_id uuid) returns jsonb language sql set search_path='' as $$select arma_private.commerce_history(p_id);$$;
revoke all on function public.commerce_history(uuid) from public,anon;
grant execute on function public.commerce_history(uuid) to authenticated;
revoke all on function arma_private.commerce_history(uuid) from public,anon;
grant execute on function arma_private.commerce_history(uuid) to authenticated;

create function public.workshop_options(p_kind text,p_search text default '',p_id uuid default null) returns jsonb language sql set search_path='' as $$select arma_private.workshop_options(p_kind,p_search,p_id);$$;
revoke all on function public.workshop_options(text,text,uuid) from public,anon;
grant execute on function public.workshop_options(text,text,uuid) to authenticated;
revoke all on function arma_private.workshop_options(text,text,uuid) from public,anon;
grant execute on function arma_private.workshop_options(text,text,uuid) to authenticated;

create function public.workshop_recipe(p_id uuid) returns jsonb language sql set search_path='' as $$select arma_private.workshop_recipe(p_id);$$;
revoke all on function public.workshop_recipe(uuid) from public,anon;
grant execute on function public.workshop_recipe(uuid) to authenticated;
revoke all on function arma_private.workshop_recipe(uuid) from public,anon;
grant execute on function arma_private.workshop_recipe(uuid) to authenticated;

create function public.workshop_history(p_kind text,p_page integer default 1) returns jsonb language sql set search_path='' as $$select arma_private.workshop_history(p_kind,p_page);$$;
revoke all on function public.workshop_history(text,integer) from public,anon;
grant execute on function public.workshop_history(text,integer) to authenticated;
revoke all on function arma_private.workshop_history(text,integer) from public,anon;
grant execute on function arma_private.workshop_history(text,integer) to authenticated;

create function public.business_dashboard(p_from date,p_to date) returns jsonb language sql set search_path='' as $$select arma_private.business_dashboard(p_from,p_to);$$;
revoke all on function public.business_dashboard(date,date) from public,anon;
grant execute on function public.business_dashboard(date,date) to authenticated;
revoke all on function arma_private.business_dashboard(date,date) from public,anon;
grant execute on function arma_private.business_dashboard(date,date) to authenticated;

revoke all on function arma_private.capture_order_money() from public,anon,authenticated;
revoke all on function arma_private.capture_sale_cost() from public,anon,authenticated;
