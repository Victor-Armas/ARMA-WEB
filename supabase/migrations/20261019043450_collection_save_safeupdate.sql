-- Bound singleton and featured-slot writes for PostgREST safeupdate.
-- Preserve role checks, row locking, revision checks and atomic replacement.
create or replace function arma_private.save_collection(p_payload jsonb,p_expected timestamptz) returns void
language plpgsql security definer set search_path='' as $$
declare v_before jsonb; v_revision timestamptz; v_featured jsonb; v_count integer;
begin
 if not arma_private.can_manage_collection() then raise exception 'Solo propietario y administrador pueden gestionar la colección.' using errcode='42501'; end if;
 select updated_at,to_jsonb(s) into v_revision,v_before from public.collection_settings s where s.singleton = true for update;
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
 intro=trim(p_payload->>'intro'),offers_title=trim(p_payload->>'offers_title'),updated_at=clock_timestamp(),updated_by=auth.uid()
 where singleton = true;
 insert into arma_private.collection_changes(actor_id,action,before_data,after_data) values(auth.uid(),'save_collection',
 v_before||jsonb_build_object('featured',(select jsonb_agg(to_jsonb(f) order by position) from public.collection_featured f)),p_payload);
 delete from public.collection_featured where position between 1 and 4;
 insert into public.collection_featured(position,product_id,image_id)
 select ord::smallint,(item->>'product_id')::uuid,nullif(item->>'image_id','')::uuid from jsonb_array_elements(v_featured) with ordinality as t(item,ord);
end;$$;
