insert into public.permissions(key,module,action,description,is_active)
values('collection.manage','collection','manage','Administrar colección pública y ofertas',true)
on conflict(key) do update set is_active=true;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where r.code in ('owner','admin') and p.key='collection.manage' on conflict do nothing;

create table public.collection_settings (
  singleton boolean primary key default true check(singleton),
  published boolean not null default true,
  headline_1 text not null default 'No sigas' check(length(trim(headline_1)) between 1 and 40),
  headline_2 text not null default 'el molde.' check(length(trim(headline_2)) between 1 and 40),
  headline_3 text not null default 'Lleva ARMA.' check(length(trim(headline_3)) between 1 and 40),
  intro text not null default E'Diseños que hablan por ti.\nElige el que se siente más tuyo.' check(length(trim(intro)) between 1 and 240),
  offers_title text not null default 'Ofertas de la colección' check(length(trim(offers_title)) between 1 and 80),
  updated_at timestamptz not null default clock_timestamp(),
  updated_by uuid references public.profiles(id)
);
create table public.collection_featured (
  position smallint primary key check(position between 1 and 4),
  product_id uuid not null unique references public.products(id) on delete cascade,
  image_id uuid references public.product_images(id) on delete set null
);
create table public.collection_offers (
  product_id uuid primary key references public.products(id) on delete cascade,
  label text not null default 'Precio especial' check(length(trim(label)) between 1 and 60),
  price numeric(12,2) not null check(price>0 and price<='1000000'::numeric and price<>'NaN'::numeric),
  starts_on date,
  ends_on date,
  is_active boolean not null default true,
  updated_at timestamptz not null default clock_timestamp(),
  updated_by uuid references public.profiles(id),
  check(starts_on is null or ends_on is null or ends_on>=starts_on)
);
create table arma_private.collection_changes (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default clock_timestamp()
);
alter table public.collection_settings enable row level security;
alter table public.collection_featured enable row level security;
alter table public.collection_offers enable row level security;
alter table arma_private.collection_changes enable row level security;
revoke all on public.collection_settings,public.collection_featured,public.collection_offers from public,anon,authenticated;
revoke all on arma_private.collection_changes from public,anon,authenticated;
insert into public.collection_settings(singleton) values(true);
insert into public.collection_featured(position,product_id)
select row_number() over(order by p.name,p.id),p.id from public.products p
where p.is_active and exists(select 1 from public.product_variants v where v.product_id=p.id and v.is_active)
order by p.name,p.id limit 4;

create function arma_private.can_manage_collection() returns boolean
language sql stable security definer set search_path='' as $$
 select arma_private.actor_ready()
 and arma_private.user_has_permission(auth.uid(),'collection.manage')
 and exists(select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id
   where ur.user_id=auth.uid() and r.is_active and r.code in ('owner','admin'));
$$;
revoke all on function arma_private.can_manage_collection() from public,anon,authenticated;
grant execute on function arma_private.can_manage_collection() to authenticated;
grant select on public.collection_settings,public.collection_featured,public.collection_offers to authenticated;
create policy collection_admin_read on public.collection_settings for select to authenticated using((select arma_private.can_manage_collection()));
create policy collection_admin_read on public.collection_featured for select to authenticated using((select arma_private.can_manage_collection()));
create policy collection_admin_read on public.collection_offers for select to authenticated using((select arma_private.can_manage_collection()));

-- Internal helper called only from explicit public projections, never a public RPC.
create function arma_private.promoted_product(p_product jsonb) returns jsonb
language plpgsql stable set search_path='' as $$
declare v_offer public.collection_offers; v_today date:=(statement_timestamp() at time zone 'America/Monterrey')::date;
 v_min numeric; v_currencies integer; v_variants jsonb;
begin
 if p_product is null then return null; end if;
 select min(v.sale_price),count(distinct v.currency) into v_min,v_currencies
 from public.product_variants v where v.product_id=(p_product->>'id')::uuid and v.is_active;
 select * into v_offer from public.collection_offers o where o.product_id=(p_product->>'id')::uuid and o.is_active
   and (o.starts_on is null or o.starts_on<=v_today) and (o.ends_on is null or o.ends_on>=v_today)
   and o.price<v_min and v_currencies=1;
 if not found then return p_product||jsonb_build_object('promotion',null); end if;
 select jsonb_agg(v||jsonb_build_object('regular_price',v->'sale_price','sale_price',v_offer.price) order by ord)
 into v_variants from jsonb_array_elements(p_product->'variants') with ordinality as t(v,ord);
 return p_product||jsonb_build_object('variants',v_variants,'promotion',jsonb_build_object(
   'label',v_offer.label,'price',v_offer.price,'starts_on',v_offer.starts_on,'ends_on',v_offer.ends_on));
end; $$;
revoke all on function arma_private.promoted_product(jsonb) from public,anon,authenticated;

create function arma_private.customer_catalog_presented(p_page integer,p_search text,p_size text,p_color text,p_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_data jsonb; v_items jsonb;
begin
 if not exists(select 1 from public.collection_settings where published) then
   return jsonb_build_object('page',1,'page_size',12,'total',0,'sizes','[]'::jsonb,'colors','[]'::jsonb,'items','[]'::jsonb,'published',false);
 end if;
 v_data:=arma_private.customer_catalog(p_page,p_search,p_size,p_color,p_id);
 select coalesce(jsonb_agg(arma_private.promoted_product(item) order by ord),'[]'::jsonb)
 into v_items from jsonb_array_elements(v_data->'items') with ordinality as t(item,ord);
 return jsonb_set(v_data,'{items}',v_items)||jsonb_build_object('published',true);
end; $$;
revoke all on function arma_private.customer_catalog_presented(integer,text,text,text,uuid) from public,anon,authenticated;
grant execute on function arma_private.customer_catalog_presented(integer,text,text,text,uuid) to anon,authenticated;
create or replace function public.customer_catalog_page(p_page integer default 1,p_search text default '',p_size text default '',p_color text default '',p_id uuid default null)
returns jsonb language sql stable security invoker set search_path='' as $$
 select arma_private.customer_catalog_presented(p_page,p_search,p_size,p_color,p_id);
$$;

create function arma_private.customer_collection() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_settings public.collection_settings; v_featured jsonb:='[]'; v_offers jsonb:='[]'; v_items jsonb:='[]';
 v_row record; v_product jsonb; v_image jsonb; v_total integer;
begin
 select * into v_settings from public.collection_settings;
 if v_settings.published then
   select count(*) into v_total from public.products p where p.is_active
     and exists(select 1 from public.product_variants v where v.product_id=p.id and v.is_active);
   for v_row in
     select f.product_id,f.image_id,0 as section,f.position as sort from public.collection_featured f
     union all
     select o.product_id,null::uuid,1,0 from public.collection_offers o where o.is_active
     order by section,sort,product_id
   loop
     v_product:=arma_private.customer_catalog_presented(1,'','','',v_row.product_id)->'items'->0;
     if v_product is null then continue; end if;
     if v_row.section=1 and (v_product->'promotion'='null'::jsonb or jsonb_array_length(v_offers)>=12) then continue; end if;
     if v_row.section=0 then v_featured:=v_featured||jsonb_build_array(v_row.product_id);
     else v_offers:=v_offers||jsonb_build_array(v_row.product_id); end if;
     -- A chosen hero photo overrides the cover on the landing only; catalogue/gallery stay unchanged.
     select image into v_image from jsonb_array_elements(v_product->'images') image
       where image->>'id'=v_row.image_id::text limit 1;
     v_image:=coalesce(v_image,v_product->'images'->0);
     v_product:=jsonb_set(v_product,'{images}',case when v_image is null then '[]'::jsonb else jsonb_build_array(v_image) end);
     if not exists(select 1 from jsonb_array_elements(v_items) p where p->>'id'=v_product->>'id') then
       v_items:=v_items||jsonb_build_array(v_product);
     end if;
   end loop;
 end if;
 return jsonb_build_object('page',1,'page_size',12,'total',coalesce(v_total,0),'sizes','[]'::jsonb,'colors','[]'::jsonb,
   'items',v_items,'featured_ids',v_featured,'offer_ids',v_offers,'published',v_settings.published,
   'settings',jsonb_build_object('published',v_settings.published,'headline_1',v_settings.headline_1,
   'headline_2',v_settings.headline_2,'headline_3',v_settings.headline_3,'intro',v_settings.intro,'offers_title',v_settings.offers_title));
end; $$;
revoke all on function arma_private.customer_collection() from public,anon,authenticated;
grant execute on function arma_private.customer_collection() to anon,authenticated;
create function public.customer_collection() returns jsonb language sql stable security invoker set search_path='' as $$select arma_private.customer_collection();$$;
revoke all on function public.customer_collection() from public,anon,authenticated;
grant execute on function public.customer_collection() to anon,authenticated;

create or replace function arma_private.customer_catalog_image(p_path text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.collection_settings where published)
 and exists(select 1 from public.product_images i join public.products p on p.id=i.product_id
   where p.is_active and i.archived_at is null and i.storage_bucket='inventory-images'
   and (i.storage_path=p_path or i.thumbnail_path=p_path)
   and exists(select 1 from public.product_variants v where v.product_id=p.id and v.is_active));
$$;

create function arma_private.collection_admin_data() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not arma_private.can_manage_collection() then raise exception 'Solo propietario y administrador pueden gestionar la colección.' using errcode='42501'; end if;
 return jsonb_build_object('settings',(select to_jsonb(s)-'singleton'-'updated_by' from public.collection_settings s),
 'featured',coalesce((select jsonb_agg(to_jsonb(f) order by f.position) from public.collection_featured f),'[]'::jsonb),
 'offers',coalesce((select jsonb_agg(to_jsonb(o)-'updated_by' order by o.updated_at desc,o.product_id) from public.collection_offers o),'[]'::jsonb),
 'products',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'is_active',p.is_active,
 'base_price',(select min(v.sale_price) from public.product_variants v where v.product_id=p.id and v.is_active),
 'currency',(select min(v.currency) from public.product_variants v where v.product_id=p.id and v.is_active),
 'currency_count',(select count(distinct v.currency) from public.product_variants v where v.product_id=p.id and v.is_active),
 'images',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'storage_path',coalesce(i.thumbnail_path,i.storage_path),'alt_text',i.alt_text,'background_color',i.background_color) order by i.is_cover desc,i.sort_order,i.id)
 from public.product_images i where i.product_id=p.id and i.archived_at is null),'[]'::jsonb)) order by p.name,p.id)
 from public.products p where p.is_active or exists(select 1 from public.collection_featured f where f.product_id=p.id)
 or exists(select 1 from public.collection_offers o where o.product_id=p.id)),'[]'::jsonb));
end;$$;
revoke all on function arma_private.collection_admin_data() from public,anon,authenticated;
grant execute on function arma_private.collection_admin_data() to authenticated;
create function public.collection_admin_data() returns jsonb language sql stable security invoker set search_path='' as $$select arma_private.collection_admin_data();$$;
revoke all on function public.collection_admin_data() from public,anon,authenticated;
grant execute on function public.collection_admin_data() to authenticated;

create function arma_private.save_collection(p_payload jsonb,p_expected timestamptz) returns void
language plpgsql security definer set search_path='' as $$
declare v_before jsonb; v_revision timestamptz; v_featured jsonb; v_count integer;
begin
 if not arma_private.can_manage_collection() then raise exception 'Solo propietario y administrador pueden gestionar la colección.' using errcode='42501'; end if;
 select updated_at,to_jsonb(s) into v_revision,v_before from public.collection_settings s for update;
 if p_expected is distinct from v_revision then raise exception 'Otra persona actualizó la colección. Recarga antes de guardar.' using errcode='40001'; end if;
 v_featured:=p_payload->'featured';
 if jsonb_typeof(v_featured) is distinct from 'array' or jsonb_array_length(v_featured)<>4 then raise exception 'Elige cuatro modelos principales.'; end if;
 select count(distinct (item->>'product_id')::uuid) into v_count from jsonb_array_elements(v_featured) item;
 if v_count<>4 then raise exception 'Los cuatro modelos deben ser distintos.'; end if;
 if exists(select 1 from jsonb_array_elements(v_featured) item where not exists(select 1 from public.products p where p.id=(item->>'product_id')::uuid and p.is_active
   and exists(select 1 from public.product_variants v where v.product_id=p.id and v.is_active))) then raise exception 'Elige modelos activos con variantes.'; end if;
 if exists(select 1 from jsonb_array_elements(v_featured) item where nullif(item->>'image_id','') is not null and not exists(
   select 1 from public.product_images i where i.id=(item->>'image_id')::uuid and i.product_id=(item->>'product_id')::uuid and i.archived_at is null)) then raise exception 'La fotografía debe pertenecer al modelo seleccionado.'; end if;
 update public.collection_settings set published=(p_payload->>'published')::boolean,
 headline_1=trim(p_payload->>'headline_1'),headline_2=trim(p_payload->>'headline_2'),headline_3=trim(p_payload->>'headline_3'),
 intro=trim(p_payload->>'intro'),offers_title=trim(p_payload->>'offers_title'),updated_at=clock_timestamp(),updated_by=auth.uid();
 insert into arma_private.collection_changes(actor_id,action,before_data,after_data) values(auth.uid(),'save_collection',
 v_before||jsonb_build_object('featured',(select jsonb_agg(to_jsonb(f) order by position) from public.collection_featured f)),p_payload);
 delete from public.collection_featured;
 insert into public.collection_featured(position,product_id,image_id)
 select ord::smallint,(item->>'product_id')::uuid,nullif(item->>'image_id','')::uuid from jsonb_array_elements(v_featured) with ordinality as t(item,ord);
end;$$;
revoke all on function arma_private.save_collection(jsonb,timestamptz) from public,anon,authenticated;
grant execute on function arma_private.save_collection(jsonb,timestamptz) to authenticated;
create function public.save_collection(p_payload jsonb,p_expected timestamptz) returns void language sql security invoker set search_path='' as $$select arma_private.save_collection(p_payload,p_expected);$$;
revoke all on function public.save_collection(jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.save_collection(jsonb,timestamptz) to authenticated;

create function arma_private.save_collection_offer(p_payload jsonb,p_expected timestamptz default null) returns void
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=(p_payload->>'product_id')::uuid; v_price numeric; v_min numeric; v_currencies integer;
 v_before public.collection_offers; v_exists boolean; v_start date; v_end date;
begin
 if not arma_private.can_manage_collection() then raise exception 'Solo propietario y administrador pueden gestionar ofertas.' using errcode='42501'; end if;
 perform 1 from public.collection_settings for update;
 select * into v_before from public.collection_offers where product_id=v_id for update; v_exists:=found;
 if (v_exists and p_expected is distinct from v_before.updated_at) or (not v_exists and p_expected is not null) then raise exception 'La oferta cambió. Recarga antes de guardar.' using errcode='40001'; end if;
 if not exists(select 1 from public.products where id=v_id and is_active) then raise exception 'El modelo no está activo.'; end if;
 v_price:=(p_payload->>'price')::numeric;
 select min(v.sale_price),count(distinct v.currency) into v_min,v_currencies from public.product_variants v where v.product_id=v_id and v.is_active;
 if v_min is null or v_currencies<>1 then raise exception 'La oferta requiere variantes activas en una misma moneda.'; end if;
 if v_price is null or v_price='NaN'::numeric or v_price<=0 or v_price>1000000 or v_price<>round(v_price,2) or v_price>=v_min then
   raise exception 'El precio de oferta debe ser positivo, tener hasta dos decimales y ser menor que todas las variantes del modelo.'; end if;
 v_start:=nullif(p_payload->>'starts_on','')::date; v_end:=nullif(p_payload->>'ends_on','')::date;
 if v_start is not null and v_end is not null and v_end<v_start then raise exception 'La fecha final no puede ser anterior al inicio.'; end if;
 insert into public.collection_offers(product_id,label,price,starts_on,ends_on,is_active,updated_by)
 values(v_id,trim(p_payload->>'label'),v_price,v_start,v_end,(p_payload->>'is_active')::boolean,auth.uid())
 on conflict(product_id) do update set label=excluded.label,price=excluded.price,starts_on=excluded.starts_on,
 ends_on=excluded.ends_on,is_active=excluded.is_active,updated_at=clock_timestamp(),updated_by=excluded.updated_by;
 insert into arma_private.collection_changes(actor_id,action,before_data,after_data) values(auth.uid(),'save_offer',
 case when v_exists then to_jsonb(v_before) else null end,p_payload);
end;$$;
revoke all on function arma_private.save_collection_offer(jsonb,timestamptz) from public,anon,authenticated;
grant execute on function arma_private.save_collection_offer(jsonb,timestamptz) to authenticated;
create function public.save_collection_offer(p_payload jsonb,p_expected timestamptz default null) returns void language sql security invoker set search_path='' as $$select arma_private.save_collection_offer(p_payload,p_expected);$$;
revoke all on function public.save_collection_offer(jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.save_collection_offer(jsonb,timestamptz) to authenticated;
