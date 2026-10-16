-- Administrative photo previews must work even when products.read is disabled.
create function arma_private.collection_admin_image(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select arma_private.can_manage_collection() and exists(select 1 from public.product_images i
 where i.archived_at is null and i.storage_bucket='inventory-images' and (i.storage_path=p_path or i.thumbnail_path=p_path));
$$;
revoke all on function arma_private.collection_admin_image(text) from public,anon,authenticated;
grant execute on function arma_private.collection_admin_image(text) to authenticated;
create policy collection_admin_preview on storage.objects for select to authenticated
using(bucket_id='inventory-images' and arma_private.collection_admin_image(name));
-- The raw projection is internal now: only the publishing-aware projection is callable.
revoke execute on function arma_private.customer_catalog(integer,text,text,text,uuid) from anon,authenticated;
