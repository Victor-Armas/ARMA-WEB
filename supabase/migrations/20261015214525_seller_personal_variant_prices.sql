create table arma_private.seller_variant_prices (
 seller_id uuid not null references public.profiles(id),product_variant_id uuid not null references public.product_variants(id),
 price numeric(12,2) not null check(price>0 and price<=999999),updated_at timestamptz not null default now(),
 primary key(seller_id,product_variant_id)
);
create index seller_variant_prices_variant on arma_private.seller_variant_prices(product_variant_id);
alter table arma_private.seller_variant_prices enable row level security;
revoke all on arma_private.seller_variant_prices from public,anon,authenticated;
create policy seller_variant_prices_internal on arma_private.seller_variant_prices using(false);
insert into public.permissions(key,module,action,description) values('products.price_own','products','price_own','Configurar mi precio personal de venta') on conflict(key) do nothing;
insert into public.role_permissions(role_id,permission_id) select r.id,p.id from public.roles r cross join public.permissions p where r.code in('owner','admin','seller') and p.key='products.price_own' on conflict do nothing;
create function arma_private.set_my_variant_price(p_variant uuid,p_price numeric) returns void language plpgsql security definer set search_path='' as $$
declare minimum_price numeric;begin
 if not public.has_commerce_permission('products.price_own') or not public.can_read_products() then raise exception 'No tienes permiso para configurar tu precio.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('seller:'||auth.uid()::text,0));
 if not exists(select 1 from arma_private.seller_deliveries d join public.product_variants v on v.id=d.product_variant_id join public.products p on p.id=v.product_id where d.seller_id=auth.uid() and v.id=p_variant and v.is_active and p.is_active and v.currency='MXN') then raise exception 'Esta variante no pertenece a tus entregas.' using errcode='42501';end if;
 if p_price is null then delete from arma_private.seller_variant_prices where seller_id=auth.uid() and product_variant_id=p_variant;return;end if;
 if p_price::text in('NaN','Infinity','-Infinity') or p_price<=0 or p_price>999999 or p_price<>round(p_price,2) then raise exception 'Escribe un precio válido mayor que cero, con hasta dos decimales.';end if;
 select max(d.unit_price) into minimum_price from arma_private.seller_deliveries d join public.inventory_balances b on b.location_id=d.location_id where d.seller_id=auth.uid() and d.product_variant_id=p_variant and b.physical_quantity>0;
 if minimum_price is not null and p_price<minimum_price then raise exception 'El precio debe ser al menos $% para cubrir tus entregas actuales.',minimum_price;end if;
 insert into arma_private.seller_variant_prices(seller_id,product_variant_id,price) values(auth.uid(),p_variant,p_price)
 on conflict(seller_id,product_variant_id) do update set price=excluded.price,updated_at=now();
end;$$;
create function public.set_my_variant_price(p_variant uuid,p_price numeric) returns void language sql security invoker set search_path='' as $$select arma_private.set_my_variant_price(p_variant,p_price);$$;
revoke all on function public.set_my_variant_price(uuid,numeric),arma_private.set_my_variant_price(uuid,numeric) from public,anon;
grant execute on function public.set_my_variant_price(uuid,numeric),arma_private.set_my_variant_price(uuid,numeric) to authenticated;

CREATE OR REPLACE FUNCTION arma_private.scoped_product_detail(p_id uuid, p_scope text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if not public.can_read_products() then raise exception 'No tienes acceso a Productos.' using errcode='42501';end if;
 if p_scope is null or p_scope not in('mine','warehouse','catalog') then raise exception 'Vista inválida.';end if;
 if p_scope='warehouse' and not public.has_commerce_permission('inventory.sell_workshop') then raise exception 'No tienes acceso al taller.' using errcode='42501';end if;
 return (select jsonb_build_object('id',p.id,'name',p.name,'code',p.code,'description',p.description,'is_demo',p.is_demo,
 'product_images',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'storage_bucket',i.storage_bucket,'storage_path',i.storage_path,'alt_text',i.alt_text,'caption',i.caption,'sort_order',i.sort_order,'is_cover',i.is_cover,'background_color',i.background_color) order by i.is_cover desc,i.sort_order) from public.product_images i where i.product_id=p.id and i.archived_at is null),'[]'::jsonb),
 'product_variants',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'sku',v.sku,'size',v.size,'color',v.color,'sale_price',v.sale_price, 'seller_price',case when p_scope<>'warehouse' then (select sp.price from arma_private.seller_variant_prices sp where sp.seller_id=auth.uid() and sp.product_variant_id=v.id) else null end,'currency',v.currency,
 'inventory_balances',coalesce((select jsonb_agg(jsonb_build_object('physical_quantity',b.physical_quantity,'reserved_quantity',b.reserved_quantity,'available_quantity',b.available_quantity)) from public.inventory_balances b where b.product_variant_id=v.id and ((p_scope='warehouse' and exists(select 1 from public.inventory_locations l where l.id=b.location_id and l.is_default and l.is_active)) or (p_scope='mine' and exists(select 1 from arma_private.seller_deliveries d where d.location_id=b.location_id and d.seller_id=auth.uid())))),'[]'::jsonb),
 'consignment_lots',case when p_scope='mine' then coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'unit_price',d.unit_price,'available',b.available_quantity,'created_at',d.created_at) order by d.created_at,d.id) from arma_private.seller_deliveries d join public.inventory_balances b on b.location_id=d.location_id where d.product_variant_id=v.id and d.seller_id=auth.uid() and b.available_quantity>0),'[]'::jsonb) else '[]'::jsonb end) order by v.color,v.size) from public.product_variants v where v.product_id=p.id and v.is_active),'[]'::jsonb)) from public.products p where p.id=p_id and p.is_active);
end;$function$;

CREATE OR REPLACE FUNCTION arma_private.scoped_products_page(p_scope text, p_page integer DEFAULT 1, p_search text DEFAULT ''::text)
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
            'color', v.color, 'sale_price', v.sale_price, 'seller_price',case when p_scope<>'warehouse' then (select sp.price from arma_private.seller_variant_prices sp where sp.seller_id=auth.uid() and sp.product_variant_id=v.id) else null end,
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
