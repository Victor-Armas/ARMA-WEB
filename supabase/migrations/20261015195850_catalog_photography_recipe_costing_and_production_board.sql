alter table public.product_images add column background_color text not null default 'white' check(background_color in('white','gray','black')),add column archived_at timestamptz;
alter table public.material_images add column background_color text not null default 'white' check(background_color in('white','gray','black')),add column archived_at timestamptz;
alter table arma_private.product_recipes add column electricity_cost numeric(12,2) not null default 0 check(electricity_cost>=0),add column tape_cost numeric(12,2) not null default 0 check(tape_cost>=0),add column other_cost numeric(12,2) not null default 0 check(other_cost>=0);
alter table public.production_orders add column electricity_cost numeric(12,2) not null default 0 check(electricity_cost>=0),add column tape_cost numeric(12,2) not null default 0 check(tape_cost>=0),add column other_cost numeric(12,2) not null default 0 check(other_cost>=0);
create table arma_private.material_cost_profiles(material_variant_id uuid primary key references public.material_variants(id),method text not null check(method in('manual','area')),manual_cost numeric(12,2),sheet_price numeric(12,2),sheet_width_cm numeric(10,2),sheet_length_cm numeric(10,2),design_width_cm numeric(10,2),design_height_cm numeric(10,2),waste_percent numeric(5,2) not null default 0 check(waste_percent between 0 and 100),unit_cost numeric(16,4) not null check(unit_cost>=0),updated_by uuid not null references auth.users(id),updated_at timestamptz not null default now());
alter table arma_private.material_cost_profiles enable row level security;
revoke all on arma_private.material_cost_profiles from public,anon,authenticated;
create policy internal_only on arma_private.material_cost_profiles to authenticated using(false) with check(false);
create index material_cost_actor_idx on arma_private.material_cost_profiles(updated_by);
create table arma_private.material_cost_changes(id uuid primary key,material_variant_id uuid not null references public.material_variants(id),payload jsonb not null,created_by uuid not null references auth.users(id),created_at timestamptz not null default now());
alter table arma_private.material_cost_changes enable row level security;
revoke all on arma_private.material_cost_changes from public,anon,authenticated;
create policy internal_only on arma_private.material_cost_changes to authenticated using(false) with check(false);
create index material_cost_changes_variant_idx on arma_private.material_cost_changes(material_variant_id);
create index material_cost_changes_actor_idx on arma_private.material_cost_changes(created_by);
create function arma_private.material_reference_cost(p_id uuid) returns numeric language sql stable set search_path='' as $$select coalesce((select unit_cost from arma_private.material_cost_profiles where material_variant_id=p_id),(select b.average_unit_cost from public.inventory_balances b join public.inventory_locations l on l.id=b.location_id where b.material_variant_id=p_id and l.is_default and l.is_active));$$;
revoke all on function arma_private.material_reference_cost(uuid) from public,anon,authenticated;

create function arma_private.catalog_image_action(p_kind text,p_id uuid,p_image uuid,p_action text,p_background text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();owner_id uuid;is_active boolean;begin
 if p_kind is null or p_kind not in('product','material') or p_action is null or p_action not in('remove','background') then raise exception 'Operación inválida.';end if;
 if p_kind='product' then select created_by,p.is_active into owner_id,is_active from public.products p where id=p_id for update;else select created_by,m.is_active into owner_id,is_active from public.materials m where id=p_id for update;end if;
 if not found or actor is null or not(public.has_commerce_permission(case when p_kind='product' then 'products.edit' else 'materials.edit' end) or (owner_id=actor and public.has_commerce_permission(case when p_kind='product' then 'products.create' else 'materials.create' end))) then raise exception 'No tienes permiso para modificar estas fotografías.' using errcode='42501';end if;
 if p_action='background' and (p_background is null or p_background not in('white','gray','black')) then raise exception 'Fondo inválido.';end if;
 if p_kind='product' then
  if not exists(select 1 from public.product_images where id=p_image and product_id=p_id) then raise exception 'Fotografía no disponible.';end if;
  if p_action='remove' then update public.product_images set archived_at=coalesce(archived_at,now()),is_cover=false where id=p_image;
   if not exists(select 1 from public.product_images where product_id=p_id and is_cover and archived_at is null) then update public.product_images set is_cover=true where id=(select id from public.product_images where product_id=p_id and archived_at is null order by sort_order,id limit 1);end if;
  else update public.product_images set background_color=p_background where id=p_image and archived_at is null;end if;
 else
  if not exists(select 1 from public.material_images where id=p_image and material_id=p_id) then raise exception 'Fotografía no disponible.';end if;
  if p_action='remove' then update public.material_images set archived_at=coalesce(archived_at,now()),is_cover=false where id=p_image;
   if not exists(select 1 from public.material_images where material_id=p_id and is_cover and archived_at is null) then update public.material_images set is_cover=true where id=(select id from public.material_images where material_id=p_id and archived_at is null order by sort_order,id limit 1);end if;
  else update public.material_images set background_color=p_background where id=p_image and archived_at is null;end if;
 end if;return p_image;end $$;

create function arma_private.material_cost_profile(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not public.has_commerce_permission('materials.read') then raise exception 'Sin permiso para consultar costos.' using errcode='42501';end if;
 return jsonb_build_object('profile',(select to_jsonb(c) from arma_private.material_cost_profiles c where material_variant_id=p_id),'inventory_cost',(select b.average_unit_cost from public.inventory_balances b join public.inventory_locations l on l.id=b.location_id where material_variant_id=p_id and l.is_default and l.is_active),'dimensions',(select jsonb_build_object('width',width_cm,'height',height_cm) from public.material_variants where id=p_id));end $$;

create function arma_private.save_material_cost(p_payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();req uuid:=(p_payload->>'request_id')::uuid;variant uuid:=(p_payload->>'variant_id')::uuid;mode text:=p_payload->>'method';cost numeric;sp numeric;sw numeric;sl numeric;dw numeric;dh numeric;waste numeric;bal public.inventory_balances;loc uuid;material_type text;apply_inventory boolean:=coalesce((p_payload->>'apply_inventory')::boolean,false);begin
 if actor is null or not public.has_commerce_permission('materials.edit') then raise exception 'No tienes permiso para editar costos.' using errcode='42501';end if;
 if req is null or variant is null then raise exception 'Falta identificador.';end if;perform pg_advisory_xact_lock(hashtextextended(req::text,0));
 if exists(select 1 from arma_private.material_cost_changes where id=req and created_by=actor and material_variant_id=variant) then return variant;end if;
 select m.material_type into material_type from public.material_variants v join public.materials m on m.id=v.material_id where v.id=variant and v.is_active and m.is_active for share of v;
 if not found then raise exception 'La variante no está activa.';end if;
 if mode='manual' then cost:=(p_payload->>'manual_cost')::numeric;if cost is null or cost::text in('NaN','Infinity','-Infinity') or cost<0 or cost>999999 or cost<>round(cost,2) then raise exception 'Costo manual inválido.';end if;
 elsif mode='area' then
  if material_type<>'dtf_transfer' then raise exception 'El cálculo por área corresponde a transferencias DTF.';end if;
  sp:=(p_payload->>'sheet_price')::numeric;sw:=(p_payload->>'sheet_width_cm')::numeric;sl:=(p_payload->>'sheet_length_cm')::numeric;dw:=(p_payload->>'design_width_cm')::numeric;dh:=(p_payload->>'design_height_cm')::numeric;waste:=(p_payload->>'waste_percent')::numeric;
  if sp is null or sw is null or sl is null or dw is null or dh is null or waste is null or exists(select 1 from unnest(array[sp,sw,sl,dw,dh,waste])v where v::text in('NaN','Infinity','-Infinity') or v<>round(v,2)) or sp<=0 or sp>999999 or sw<=0 or sw>1000 or sl<=0 or sl>10000 or dw<=0 or dh<=0 or dw>1000 or dh>1000 or waste<0 or waste>100 then raise exception 'Revisa precio, dimensiones en centímetros y merma.';end if;
  if not((dw<=sw and dh<=sl) or (dh<=sw and dw<=sl)) then raise exception 'El diseño no cabe en el formato de impresión, ni al rotarlo.';end if;
  cost:=ceil((sp/(sw*sl)*dw*dh*(1+waste/100))*100)/100;
 else raise exception 'Método de costo inválido.';end if;
 if cost>999999 then raise exception 'El costo calculado es demasiado grande.';end if;
 if apply_inventory and not public.has_commerce_permission('materials.receive') then raise exception 'Necesitas permiso para valorar existencias.' using errcode='42501';end if;
 insert into arma_private.material_cost_profiles values(variant,mode,case when mode='manual' then cost end,sp,sw,sl,dw,dh,coalesce(waste,0),cost,actor,now()) on conflict(material_variant_id) do update set method=excluded.method,manual_cost=excluded.manual_cost,sheet_price=excluded.sheet_price,sheet_width_cm=excluded.sheet_width_cm,sheet_length_cm=excluded.sheet_length_cm,design_width_cm=excluded.design_width_cm,design_height_cm=excluded.design_height_cm,waste_percent=excluded.waste_percent,unit_cost=excluded.unit_cost,updated_by=actor,updated_at=now();
 if apply_inventory then
  select id into loc from public.inventory_locations where is_default and is_active;
  insert into public.inventory_balances(location_id,material_variant_id) values(loc,variant) on conflict do nothing;
  select * into bal from public.inventory_balances where location_id=loc and material_variant_id=variant for update;
  insert into arma_private.cost_valuations values(req,bal.id,bal.average_unit_cost,cost,'Costo confirmado desde ficha de materia prima',actor,now());
  update public.inventory_balances set average_unit_cost=cost,updated_at=now() where id=bal.id;
 end if;
 insert into arma_private.material_cost_changes values(req,variant,p_payload,actor,now());return variant;end $$;

create function arma_private.image_cover(p_kind text,p_parent uuid) returns jsonb language sql stable set search_path='' as $$select case when p_kind='material' then(select jsonb_build_object('path',storage_path,'background',background_color) from public.material_images where material_id=p_parent and archived_at is null order by is_cover desc,sort_order,id limit 1) else(select jsonb_build_object('path',case when i.thumbnail_path is not null and exists(select 1 from storage.objects o where o.bucket_id=i.storage_bucket and o.name=i.thumbnail_path) then i.thumbnail_path else i.storage_path end,'background',i.background_color) from public.product_images i where product_id=p_parent and archived_at is null order by is_cover desc,sort_order,id limit 1) end;$$;
revoke all on function arma_private.image_cover(text,uuid) from public,anon,authenticated;

alter policy products_read on public.product_images using (archived_at is null and ((has_commerce_permission('products.read'::text) OR has_commerce_permission('products.manage'::text) OR (EXISTS ( SELECT 1
   FROM commerce_order_items i
  WHERE (i.product_id = product_images.product_id)))) or public.has_commerce_permission('production.read')));

alter policy materials_read on public.material_images using (archived_at is null and (( SELECT has_commerce_permission('materials.read'::text) AS has_commerce_permission) or public.has_commerce_permission('production.read')));
CREATE OR REPLACE FUNCTION arma_private.attach_product_image(p_id uuid, p_path text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_image uuid;begin
 if not (public.has_commerce_permission('products.edit') or (public.has_commerce_permission('products.create') and exists(select 1 from public.products where id=p_id and created_by=auth.uid()))) then raise exception 'No tienes permiso para agregar fotografías.' using errcode='42501';end if;
 perform 1 from public.products where id=p_id and is_active for update;if not found then raise exception 'Registro no disponible.';end if;
 if p_path is null or p_path!~('^products/'||p_id::text||'/[0-9a-f-]{36}\.(png|jpg|webp)$') or not exists(select 1 from storage.objects o where o.bucket_id='inventory-images' and o.name=p_path and o.owner_id=auth.uid()::text) then raise exception 'La fotografía no pertenece a esta operación.';end if;
 insert into public.product_images(product_id,storage_path,alt_text,sort_order,is_cover) select p_id,p_path,m.name,(select count(*) from public.product_images where product_id=p_id),not exists(select 1 from public.product_images where product_id=p_id and archived_at is null) from public.products m where m.id=p_id returning id into v_image;return v_image;end;$function$
;
CREATE OR REPLACE FUNCTION arma_private.attach_material_image(p_id uuid, p_path text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_image uuid;begin
 if not (public.has_commerce_permission('materials.edit') or (public.has_commerce_permission('materials.create') and exists(select 1 from public.materials where id=p_id and created_by=auth.uid()))) then raise exception 'No tienes permiso para agregar fotografías.' using errcode='42501';end if;
 perform 1 from public.materials where id=p_id and is_active for update;if not found then raise exception 'Registro no disponible.';end if;
 if p_path is null or p_path!~('^materials/'||p_id::text||'/[0-9a-f-]{36}\.(png|jpg|webp)$') or not exists(select 1 from storage.objects o where o.bucket_id='inventory-images' and o.name=p_path and o.owner_id=auth.uid()::text) then raise exception 'La fotografía no pertenece a esta operación.';end if;
 insert into public.material_images(material_id,storage_path,alt_text,sort_order,is_cover) select p_id,p_path,m.name,(select count(*) from public.material_images where material_id=p_id),not exists(select 1 from public.material_images where material_id=p_id and archived_at is null) from public.materials m where m.id=p_id returning id into v_image;return v_image;end;$function$
;
CREATE OR REPLACE FUNCTION arma_private.catalog_admin_page(p_kind text, p_page integer DEFAULT 1, p_search text DEFAULT ''::text, p_state text DEFAULT 'active'::text, p_type text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_result jsonb;begin
 if p_kind not in ('product','material') or p_kind is null or not public.has_commerce_permission(case when p_kind='product' then 'products.manage' else 'materials.read' end) then raise exception 'No tienes acceso a esta sección.' using errcode='42501';end if;
 if p_type is null or p_type not in ('','blank_shirt','dtf_transfer') or (p_kind='product' and p_type<>'') then raise exception 'Tipo inválido.';end if;
 if p_page is null or p_page not between 1 and 1000000 or p_search is null or length(p_search)>120 or p_state is null or p_state not in ('all','active','hidden') then raise exception 'Filtro inválido.';end if;
 if p_kind='product' then
 with matched as materialized(select p.* from public.products p where (p_state='all' or p.is_active=(p_state='active')) and (trim(p_search)='' or strpos(lower(p.name||' '||p.code||' '||coalesce(p.description,'')),lower(trim(p_search)))>0 or exists(select 1 from public.product_variants v where v.product_id=p.id and strpos(lower(v.sku||' '||coalesce(v.color,'')||' '||coalesce(v.size,'')||' '||coalesce(v.description,'')),lower(trim(p_search)))>0))),
 stats as(select count(*) total,greatest(1,least(p_page,ceil(count(*)/12.0)::int)) page from matched),selected as(select * from matched order by name,id limit 12 offset(select (page-1)*12 from stats))
 select jsonb_build_object('total',s.total,'page',s.page,'items',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('kind','product','variants',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('available',(select coalesce(sum(b.available_quantity),0) from public.inventory_balances b where b.product_variant_id=v.id),'physical',(select coalesce(sum(b.physical_quantity),0) from public.inventory_balances b where b.product_variant_id=v.id),'reserved',(select coalesce(sum(b.reserved_quantity),0) from public.inventory_balances b where b.product_variant_id=v.id)) order by v.sku) from public.product_variants v where v.product_id=p.id),'[]'::jsonb),'images',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'storage_path',i.storage_path,'alt_text',i.alt_text,'caption',i.caption,'background',i.background_color) order by i.is_cover desc,i.sort_order) from public.product_images i where i.product_id=p.id and i.archived_at is null),'[]'::jsonb)) order by p.name,p.id) from selected p),'[]'::jsonb)) into v_result from stats s;
 else
 with matched as materialized(select p.* from public.materials p where (p_type='' or p.material_type=p_type) and (p_state='all' or p.is_active=(p_state='active')) and (trim(p_search)='' or strpos(lower(p.name||' '||p.code||' '||coalesce(p.description,'')),lower(trim(p_search)))>0 or exists(select 1 from public.material_variants v where v.material_id=p.id and strpos(lower(v.sku||' '||coalesce(v.color,'')||' '||coalesce(v.size,'')||' '||coalesce(v.description,'')),lower(trim(p_search)))>0))),
 stats as(select count(*) total,greatest(1,least(p_page,ceil(count(*)/12.0)::int)) page from matched),selected as(select * from matched order by name,id limit 12 offset(select (page-1)*12 from stats))
 select jsonb_build_object('total',s.total,'page',s.page,'items',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('kind','material','variants',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('estimated_cost',arma_private.material_reference_cost(v.id),'inventory_cost',(select b.average_unit_cost from public.inventory_balances b join public.inventory_locations l on l.id=b.location_id where b.material_variant_id=v.id and l.is_default and l.is_active),'available',(select coalesce(sum(b.available_quantity),0) from public.inventory_balances b where b.material_variant_id=v.id),'physical',(select coalesce(sum(b.physical_quantity),0) from public.inventory_balances b where b.material_variant_id=v.id),'reserved',(select coalesce(sum(b.reserved_quantity),0) from public.inventory_balances b where b.material_variant_id=v.id)) order by v.sku) from public.material_variants v where v.material_id=p.id),'[]'::jsonb),'images',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'storage_path',i.storage_path,'alt_text',i.alt_text,'caption',i.caption,'background',i.background_color) order by i.is_cover desc,i.sort_order) from public.material_images i where i.material_id=p.id and i.archived_at is null),'[]'::jsonb)) order by p.name,p.id) from selected p),'[]'::jsonb)) into v_result from stats s;
 end if;
 return v_result;end;$function$
;
CREATE OR REPLACE FUNCTION arma_private.workshop_write(p_action text, p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare actor uuid:=auth.uid();req uuid;variant uuid;qty integer;cost numeric;labor numeric;margin numeric;line jsonb;bal public.inventory_balances;ord public.production_orders;rec arma_private.product_recipes;loc uuid;total_cost numeric;missing boolean;inp record;result uuid;perm text;electricity numeric;tape numeric;other_cost numeric;
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
  electricity:=coalesce((p_payload->>'electricity_cost')::numeric,0);tape:=coalesce((p_payload->>'tape_cost')::numeric,0);other_cost:=coalesce((p_payload->>'other_cost')::numeric,0);
  if exists(select 1 from unnest(array[electricity,tape,other_cost]) v where v::text in('NaN','Infinity','-Infinity') or v<0 or v>999999 or v<>round(v,2)) then raise exception 'Revisa luz, cinta y otros gastos por pieza.';end if;
  if jsonb_typeof(p_payload->'lines') is distinct from 'array' or jsonb_array_length(p_payload->'lines') not between 1 and 30 then raise exception 'Agrega entre 1 y 30 insumos.';end if;
  perform pg_advisory_xact_lock(hashtextextended(variant::text,1));
  insert into arma_private.product_recipes(product_variant_id,labor_cost,target_margin,updated_by,updated_at,electricity_cost,tape_cost,other_cost) values(variant,labor,margin,actor,now(),electricity,tape,other_cost) on conflict(product_variant_id) do update set labor_cost=excluded.labor_cost,target_margin=excluded.target_margin,electricity_cost=excluded.electricity_cost,tape_cost=excluded.tape_cost,other_cost=excluded.other_cost,updated_by=actor,updated_at=now();
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
  insert into public.production_orders(id,location_id,status,notes,created_by,planned_quantity,product_variant_id,labor_cost,target_margin,electricity_cost,tape_cost,other_cost) values(req,loc,'draft',coalesce(p_payload->>'notes',''),actor,qty,variant,rec.labor_cost,rec.target_margin,rec.electricity_cost,rec.tape_cost,rec.other_cost);
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
  total_cost:=ord.labor_cost+ord.electricity_cost+ord.tape_cost+ord.other_cost;missing:=false;
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
end $function$
;
CREATE OR REPLACE FUNCTION arma_private.workshop_options(p_kind text, p_search text DEFAULT ''::text, p_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare j jsonb;begin
 if not public.has_commerce_permission(case when p_kind='material' then 'materials.read' else 'production.read' end) then raise exception 'Sin acceso a estas variantes.' using errcode='42501';end if;
 if p_kind is null or p_kind not in('material','product','ready_product') or p_search is null or length(p_search)>120 then raise exception 'Filtro inválido.';end if;
 if p_kind='material' then
 select coalesce(jsonb_agg(x order by x.label),'[]') into j from(select v.id,m.name||' · '||v.sku||coalesce(' · '||v.size,'')||coalesce(' · '||v.color,'') label,coalesce(v.description,m.description,'') description,m.material_type type,coalesce(b.available_quantity,0) available,b.average_unit_cost cost,arma_private.material_reference_cost(v.id) estimated_cost,arma_private.image_cover('material',m.id) photo from public.material_variants v join public.materials m on m.id=v.material_id left join public.inventory_balances b on b.material_variant_id=v.id and b.location_id=(select id from public.inventory_locations where is_default and is_active) where v.is_active and m.is_active and (p_id is null or v.id=p_id) and (p_search='' or strpos(lower(m.name||' '||v.sku||' '||coalesce(v.description,'')||' '||coalesce(v.size,'')||' '||coalesce(v.color,'')),lower(trim(p_search)))>0) order by m.name,v.sku limit 100)x;
 else
 select coalesce(jsonb_agg(x order by x.label),'[]') into j from(select v.id,p.name||' · '||v.size||' · '||v.color||' · '||v.sku label,coalesce(v.description,p.description,'') description,'product'::text type,coalesce(b.available_quantity,0) available,b.average_unit_cost cost,null::numeric estimated_cost,arma_private.image_cover('product',p.id) photo from public.product_variants v join public.products p on p.id=v.product_id left join public.inventory_balances b on b.product_variant_id=v.id and b.location_id=(select id from public.inventory_locations where is_default and is_active) where (p_kind<>'ready_product' or exists(select 1 from arma_private.product_recipes r where r.product_variant_id=v.id)) and v.is_active and p.is_active and upper(v.size) in('S','M','L') and (p_id is null or v.id=p_id) and (p_search='' or strpos(lower(p.name||' '||v.sku||' '||v.size||' '||v.color),lower(trim(p_search)))>0) order by p.name,v.sku limit 100)x;
 end if;return j;end $function$
;
CREATE OR REPLACE FUNCTION arma_private.workshop_recipe(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if not public.has_commerce_permission('production.read') then raise exception 'Sin acceso a recetas.' using errcode='42501';end if;
 return jsonb_build_object('recipe',(select to_jsonb(r) from arma_private.product_recipes r where r.product_variant_id=p_id),'lines',coalesce((select jsonb_agg(jsonb_build_object('material_variant_id',r.material_variant_id,'quantity',r.quantity,'label',m.name||' · '||v.sku,'description',coalesce(v.description,m.description,''),'available',coalesce(b.available_quantity,0),'cost',arma_private.material_reference_cost(v.id),'inventory_cost',b.average_unit_cost,'photo',arma_private.image_cover('material',m.id),'active',v.is_active and m.is_active) order by m.material_type,v.sku) from arma_private.recipe_materials r join public.material_variants v on v.id=r.material_variant_id join public.materials m on m.id=v.material_id left join public.inventory_balances b on b.material_variant_id=v.id and b.location_id=(select id from public.inventory_locations where is_default and is_active) where r.product_variant_id=p_id),'[]'::jsonb));end $function$
;
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
 r.labor_cost,r.target_margin,(r.electricity_cost+r.tape_cost+r.other_cost) expenses,
 case when r.product_variant_id is not null and not exists(select 1 from arma_private.recipe_materials rm left join public.inventory_balances b on b.material_variant_id=rm.material_variant_id and b.location_id=(select id from public.inventory_locations where is_default and is_active) where rm.product_variant_id=v.id and arma_private.material_reference_cost(rm.material_variant_id) is null) then r.labor_cost+r.electricity_cost+r.tape_cost+r.other_cost+(select sum(rm.quantity*arma_private.material_reference_cost(rm.material_variant_id)) from arma_private.recipe_materials rm join public.inventory_balances b on b.material_variant_id=rm.material_variant_id and b.location_id=(select id from public.inventory_locations where is_default and is_active) where rm.product_variant_id=v.id) else null end cost
 from public.product_variants v join public.products p on p.id=v.product_id left join arma_private.product_recipes r on r.product_variant_id=v.id where v.is_active and p.is_active and upper(v.size) in('S','M','L') order by p.name,v.size limit 100)x),'[]') else '[]'::jsonb end,
 'stock_alerts',coalesce((select jsonb_agg(x order by x.available) from(
 select m.name||' · '||v.sku label,b.available_quantity available,'material'::text kind from public.inventory_balances b join public.material_variants v on v.id=b.material_variant_id join public.materials m on m.id=v.material_id where public.has_commerce_permission('materials.read') and v.is_active and m.is_active and b.available_quantity<=greatest(v.minimum_stock,5)
 union all select p.name||' · '||v.size||' · '||v.color,b.available_quantity,'product' from public.inventory_balances b join public.product_variants v on v.id=b.product_variant_id join public.products p on p.id=v.product_id where public.has_commerce_permission('products.read') and v.is_active and p.is_active and upper(v.size) in('S','M','L') and b.available_quantity<=greatest(v.minimum_stock,5)
 order by available limit 12)x),'[]')) into j;
 return j;
end $function$
;
create function arma_private.workshop_recipes_page(p_state text default 'ready',p_page int default 1,p_search text default '') returns jsonb language plpgsql stable security definer set search_path='' as $$declare j jsonb;begin
 if not public.has_commerce_permission('production.read') then raise exception 'Sin acceso a recetas.' using errcode='42501';end if;
 if p_state is null or p_state not in('ready','missing','all') or p_page is null or p_page not between 1 and 100000 or p_search is null or length(p_search)>120 then raise exception 'Filtro inválido.';end if;
 with base as materialized(select v.*,p.name,exists(select 1 from arma_private.product_recipes r where r.product_variant_id=v.id) configured from public.product_variants v join public.products p on p.id=v.product_id where v.is_active and p.is_active and upper(v.size) in('S','M','L') and (p_search='' or strpos(lower(p.name||' '||v.sku||' '||v.size||' '||v.color),lower(trim(p_search)))>0)),
 matched as materialized(select * from base where p_state='all' or configured=(p_state='ready')),stats as(select count(*) total,greatest(1,least(p_page,ceil(count(*)/12.0)::int)) page from matched),selected as(select * from matched order by name,size,color,id limit 12 offset(select (page-1)*12 from stats))
 select jsonb_build_object('total',s.total,'page',s.page,'ready',(select count(*) from base where configured),'missing',(select count(*) from base where not configured),'items',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'label',v.name||' · '||v.size||' · '||v.color,'description',coalesce(v.description,''),'type','product','available',coalesce((select sum(available_quantity) from public.inventory_balances where product_variant_id=v.id),0),'cost',null,'photo',arma_private.image_cover('product',v.product_id),'configured',v.configured,'inputs',(select count(*) from arma_private.recipe_materials where product_variant_id=v.id)) order by v.name,v.size,v.color) from selected v),'[]')) into j from stats s;return j;end $$;

create function arma_private.production_board(p_status text default 'draft',p_page int default 1,p_search text default '') returns jsonb language plpgsql stable security definer set search_path='' as $$declare j jsonb;begin
 if not public.has_commerce_permission('production.read') then raise exception 'Sin acceso al armado.' using errcode='42501';end if;
 if p_status is null or p_status not in('draft','completed','cancelled') or p_page is null or p_page not between 1 and 100000 or p_search is null or length(p_search)>120 then raise exception 'Filtro inválido.';end if;
 with base as materialized(select o.*,p.name||' · '||v.size||' · '||v.color label,v.product_id from public.production_orders o join public.product_variants v on v.id=o.product_variant_id join public.products p on p.id=v.product_id where o.planned_quantity is not null and (p_search='' or strpos(lower(p.name||' '||v.sku||' '||o.order_number::text),lower(trim(p_search)))>0)),
 filtered as materialized(select * from base where status=p_status),stats as(select count(*) total,greatest(1,least(p_page,ceil(count(*)/12.0)::int)) page from filtered),selected as(select * from filtered order by case when p_status='draft' then created_at end asc,case when p_status<>'draft' then created_at end desc,id limit 12 offset(select(page-1)*12 from stats))
 select jsonb_build_object('total',s.total,'page',s.page,'counts',jsonb_build_object('draft',(select count(*) from base where status='draft'),'completed',(select count(*) from base where status='completed'),'cancelled',(select count(*) from base where status='cancelled')),'items',coalesce((select jsonb_agg(to_jsonb(o)||jsonb_build_object('photo',arma_private.image_cover('product',o.product_id),'inputs',coalesce((select jsonb_agg(jsonb_build_object('label',m.name||' · '||mv.sku,'description',coalesce(mv.description,m.description,''),'quantity',i.quantity,'per_unit',i.per_unit,'unit_cost',i.unit_cost,'photo',arma_private.image_cover('material',m.id)) order by m.name,mv.sku) from public.production_inputs i join public.material_variants mv on mv.id=i.material_variant_id join public.materials m on m.id=mv.material_id where i.production_order_id=o.id),'[]')) order by case when p_status='draft' then o.created_at end asc,case when p_status<>'draft' then o.created_at end desc,o.id) from selected o),'[]')) into j from stats s;return j;end $$;

create function public.catalog_image_action(p_kind text,p_id uuid,p_image uuid,p_action text,p_background text default null) returns uuid language sql set search_path='' as $$select arma_private.catalog_image_action(p_kind,p_id,p_image,p_action,p_background);$$;
revoke all on function public.catalog_image_action(text,uuid,uuid,text,text) from public,anon;grant execute on function public.catalog_image_action(text,uuid,uuid,text,text) to authenticated;
revoke all on function arma_private.catalog_image_action(text,uuid,uuid,text,text) from public,anon;grant execute on function arma_private.catalog_image_action(text,uuid,uuid,text,text) to authenticated;

create function public.material_cost_profile(p_id uuid) returns jsonb language sql set search_path='' as $$select arma_private.material_cost_profile(p_id);$$;
revoke all on function public.material_cost_profile(uuid) from public,anon;grant execute on function public.material_cost_profile(uuid) to authenticated;
revoke all on function arma_private.material_cost_profile(uuid) from public,anon;grant execute on function arma_private.material_cost_profile(uuid) to authenticated;

create function public.save_material_cost(p_payload jsonb) returns uuid language sql set search_path='' as $$select arma_private.save_material_cost(p_payload);$$;
revoke all on function public.save_material_cost(jsonb) from public,anon;grant execute on function public.save_material_cost(jsonb) to authenticated;
revoke all on function arma_private.save_material_cost(jsonb) from public,anon;grant execute on function arma_private.save_material_cost(jsonb) to authenticated;

create function public.workshop_recipes_page(p_state text default 'ready',p_page int default 1,p_search text default '') returns jsonb language sql set search_path='' as $$select arma_private.workshop_recipes_page(p_state,p_page,p_search);$$;
revoke all on function public.workshop_recipes_page(text,int,text) from public,anon;grant execute on function public.workshop_recipes_page(text,int,text) to authenticated;
revoke all on function arma_private.workshop_recipes_page(text,int,text) from public,anon;grant execute on function arma_private.workshop_recipes_page(text,int,text) to authenticated;

create function public.production_board(p_status text default 'draft',p_page int default 1,p_search text default '') returns jsonb language sql set search_path='' as $$select arma_private.production_board(p_status,p_page,p_search);$$;
revoke all on function public.production_board(text,int,text) from public,anon;grant execute on function public.production_board(text,int,text) to authenticated;
revoke all on function arma_private.production_board(text,int,text) from public,anon;grant execute on function arma_private.production_board(text,int,text) to authenticated;
