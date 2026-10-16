-- Public read projection only. Operational tables remain protected by existing RLS.
-- SECURITY DEFINER is limited to these explicit, read-only catalogue projections
-- in an unexposed schema; it never returns costs, quantities, customers or staff.
create function arma_private.customer_catalog(
  p_page integer default 1, p_search text default '', p_size text default '',
  p_color text default '', p_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_page integer := greatest(1, least(coalesce(p_page,1),100000));
  v_search text := left(trim(coalesce(p_search,'')),120);
  v_size text := left(trim(coalesce(p_size,'')),40);
  v_color text := left(trim(coalesce(p_color,'')),80);
  v_result jsonb;
begin
  with eligible as materialized (
    select p.id,p.name,p.description,p.created_at
    from public.products p
    where p.is_active and exists (
      select 1 from public.product_variants v where v.product_id=p.id and v.is_active
    )
  ), matched as materialized (
    select p.* from eligible p
    where (p_id is null or p.id=p_id)
      and (v_search='' or strpos(lower(p.name||' '||coalesce(p.description,'')),lower(v_search))>0)
      and exists(select 1 from public.product_variants v where v.product_id=p.id and v.is_active
        and (v_size='' or v.size=v_size) and (v_color='' or v.color=v_color))
  ), stats as (
    select count(*)::integer as total,
      least(v_page,greatest(1,ceil(count(*)/12.0)::integer)) as page from matched
  ), selected as (
    select p.* from matched p order by p.name,p.id
    limit 12 offset ((select page from stats)-1)*12
  )
  select jsonb_build_object(
    'total',s.total,'page',s.page,'page_size',12,
    'sizes',coalesce((select jsonb_agg(x.size order by case upper(x.size) when 'XS' then 1 when 'S' then 2 when 'CH' then 2 when 'M' then 3 when 'L' then 4 when 'G' then 4 when 'XL' then 5 else 6 end,x.size)
      from (select distinct v.size from public.product_variants v join eligible e on e.id=v.product_id where v.is_active) x),'[]'::jsonb),
    'colors',coalesce((select jsonb_agg(x.color order by x.color) from (select distinct v.color from public.product_variants v join eligible e on e.id=v.product_id where v.is_active) x),'[]'::jsonb),
    'items',coalesce((select jsonb_agg(jsonb_build_object(
      'id',p.id,'name',p.name,'description',p.description,
      'variants',coalesce((select jsonb_agg(jsonb_build_object(
        'id',v.id,'size',v.size,'color',v.color,'description',v.description,
        'sale_price',v.sale_price,'currency',v.currency) order by v.size,v.color,v.id)
        from public.product_variants v where v.product_id=p.id and v.is_active),'[]'::jsonb),
      'images',coalesce((select jsonb_agg(jsonb_build_object(
        'id',i.id,'storage_path',i.storage_path,'thumbnail_path',i.thumbnail_path,
        'alt_text',i.alt_text,'caption',i.caption,'background_color',i.background_color)
        order by i.is_cover desc,i.sort_order,i.id)
        from (select pi.* from public.product_images pi where pi.product_id=p.id and pi.archived_at is null
          order by pi.is_cover desc,pi.sort_order,pi.id limit case when p_id is null then 1 else 30 end) i),'[]'::jsonb)
    ) order by p.name,p.id) from selected p),'[]'::jsonb)
  ) into v_result from stats s;
  return v_result;
end; $$;
revoke all on function arma_private.customer_catalog(integer,text,text,text,uuid) from public,anon,authenticated;
grant usage on schema arma_private to anon;
grant execute on function arma_private.customer_catalog(integer,text,text,text,uuid) to anon,authenticated;

create function public.customer_catalog_page(
  p_page integer default 1,p_search text default '',p_size text default '',p_color text default '',p_id uuid default null
) returns jsonb language sql stable security invoker set search_path='' as $$
  select arma_private.customer_catalog(p_page,p_search,p_size,p_color,p_id);
$$;
revoke all on function public.customer_catalog_page(integer,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.customer_catalog_page(integer,text,text,text,uuid) to anon,authenticated;

-- A private bucket stays private. Guests can sign only photographs currently
-- attached to an active product with active variants; raw materials stay private.
create function arma_private.customer_catalog_image(p_path text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.product_images i
    join public.products p on p.id=i.product_id
    where p.is_active and i.archived_at is null and i.storage_bucket='inventory-images'
      and (i.storage_path=p_path or i.thumbnail_path=p_path)
      and exists(select 1 from public.product_variants v where v.product_id=p.id and v.is_active));
$$;
revoke all on function arma_private.customer_catalog_image(text) from public,anon,authenticated;
grant execute on function arma_private.customer_catalog_image(text) to anon;
create policy customer_catalog_images_read on storage.objects for select to anon
using (bucket_id='inventory-images' and arma_private.customer_catalog_image(name));
comment on function public.customer_catalog_page(integer,text,text,text,uuid) is
  'Guest catalogue: active products, display prices, variants and photos only. No stock quantities or operational data. Fixed 12-item pagination.';
