create function arma_private.seller_delivery_options(p_search text default '') returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.has_commerce_permission('consignments.manage') then raise exception 'No tienes permiso para entregar mercancía.' using errcode='42501';end if;
 if length(coalesce(p_search,''))>120 then raise exception 'Búsqueda demasiado larga.';end if;
 return coalesce((select jsonb_agg(x.row order by x.label,x.id) from(select v.id,p.name||' · '||v.color||' · '||v.size||' · '||v.sku label,jsonb_build_object('id',v.id,'label',p.name||' · '||v.color||' · '||v.size||' · '||v.sku,'description',coalesce(p.description,''),'type','product','available',coalesce(b.available_quantity,0),'cost',null,'photo',arma_private.image_cover('product',p.id)) row
 from public.product_variants v join public.products p on p.id=v.product_id left join public.inventory_balances b on b.product_variant_id=v.id and exists(select 1 from public.inventory_locations l where l.id=b.location_id and l.is_default and l.is_active)
 where p.is_active and v.is_active and upper(trim(v.size)) in('S','M','L') and v.currency='MXN' and (coalesce(p_search,'')='' or strpos(lower(p.name||' '||v.sku||' '||v.color||' '||v.size),lower(trim(p_search)))>0) order by p.name,v.sku limit 100)x),'[]'::jsonb);
end;$$;
create function public.seller_delivery_options(p_search text default '') returns jsonb language sql security invoker set search_path='' as $$select arma_private.seller_delivery_options(p_search);$$;
revoke all on function public.seller_delivery_options(text),arma_private.seller_delivery_options(text) from public,anon;
grant execute on function public.seller_delivery_options(text),arma_private.seller_delivery_options(text) to authenticated;
