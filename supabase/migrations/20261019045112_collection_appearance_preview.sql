CREATE OR REPLACE FUNCTION arma_private.collection_preview()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_settings public.collection_settings; v_featured jsonb:='[]'; v_offers jsonb:='[]'; v_items jsonb:='[]';
 v_row record; v_product jsonb; v_image jsonb; v_total integer;
begin
 if not arma_private.can_manage_collection() then raise exception 'Solo propietario y administrador pueden previsualizar la colección.' using errcode='42501'; end if;
 select * into v_settings from public.collection_settings;
 if true then
   select count(*) into v_total from public.products p where p.is_active
     and exists(select 1 from public.product_variants v where v.product_id=p.id and v.is_active);
   for v_row in
     select f.product_id,f.image_id,0 as section,f.position as sort from public.collection_featured f
     union all
     select o.product_id,null::uuid,1,0 from public.collection_offers o where o.is_active
     order by section,sort,product_id
   loop
     v_product:=arma_private.promoted_product(arma_private.customer_catalog(1,'','','',v_row.product_id)->'items'->0);
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
end; $function$
;
create function public.collection_preview() returns jsonb language sql stable set search_path='' as $$select arma_private.collection_preview();$$;
revoke all on function arma_private.collection_preview(),public.collection_preview() from public,anon,authenticated;
grant execute on function arma_private.collection_preview(),public.collection_preview() to authenticated;

