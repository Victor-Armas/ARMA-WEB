-- Backgrounds, seasonal logos and continuous borders. Preserve legacy RPC contracts.
create or replace function arma_private.collection_appearance_valid(p jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare c text; d text;
begin
 if jsonb_typeof(p) is distinct from 'object' then return false; end if;
 p:='{"background_path": null, "background_mode": "cover", "background_strength": 25, "background_tile_size": 360, "logo_path": null, "artwork_mode": "single", "artwork_height": 96, "artwork_position": "top"}'::jsonb||p;
 if (select count(*) from jsonb_object_keys(p))<>15
 or not (p ?& array['preset','colors','decoration','intensity','starts_on','ends_on','artwork_path']) then return false; end if;
 if coalesce(p->>'preset','') not in ('arma','muertos','christmas') or coalesce(p->>'decoration','') not in ('none','muertos','christmas')
 or coalesce(p->>'intensity','') not in ('subtle','festive') then return false; end if;
 if jsonb_typeof(p->'colors') is distinct from 'object' or (select count(*) from jsonb_object_keys(p->'colors'))<>5
 or not (p->'colors' ?& array['paper','ink','electric','acid','coral']) then return false; end if;
 foreach c in array array['paper','ink','electric','acid','coral'] loop
  if jsonb_typeof(p->'colors'->c) is distinct from 'string' or coalesce(p->'colors'->>c,'') !~ '^#[0-9a-fA-F]{6}$' then return false; end if;
 end loop;
 if arma_private.collection_color_luminance(p->'colors'->>'paper')<0.65 or arma_private.collection_color_luminance(p->'colors'->>'ink')>0.1 then return false; end if;
 foreach c in array array['starts_on','ends_on'] loop
  if p->c <> 'null'::jsonb then
   d:=p->>c;
   if jsonb_typeof(p->c) is distinct from 'string' or d !~ '^\d{4}-\d{2}-\d{2}$' or to_char(d::date,'YYYY-MM-DD')<>d then return false; end if;
  end if;
 end loop;
 if p->>'starts_on' is not null and p->>'ends_on' is not null and p->>'ends_on'<p->>'starts_on' then return false; end if;
 if p->'artwork_path'<>'null'::jsonb and (jsonb_typeof(p->'artwork_path') is distinct from 'string'
 or p->>'artwork_path' !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$') then return false; end if;

 if coalesce(p->>'background_mode','') not in ('cover','pattern') or coalesce(p->>'artwork_mode','') not in ('single','repeat')
 or coalesce(p->>'artwork_position','') not in ('top','bottom','both') then return false; end if;
 foreach c in array array['background_strength','background_tile_size','artwork_height'] loop
  if jsonb_typeof(p->c) is distinct from 'number' or (p->>c)::numeric<>trunc((p->>c)::numeric) then return false; end if;
 end loop;
 if (p->>'background_strength')::numeric not between 0 and 60 or (p->>'background_tile_size')::numeric not between 120 and 800
 or (p->>'artwork_height')::numeric not between 40 and 240 then return false; end if;
 foreach c in array array['background_path','logo_path'] loop
  if p->c<>'null'::jsonb and (jsonb_typeof(p->c) is distinct from 'string' or p->>c !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$') then return false; end if;
 end loop;
 return true;
exception when others then return false;
end;$$;
update public.collection_appearance set appearance='{"background_path": null, "background_mode": "cover", "background_strength": 25, "background_tile_size": 360, "logo_path": null, "artwork_mode": "single", "artwork_height": 96, "artwork_position": "top"}'::jsonb||appearance where singleton=true;

create or replace function arma_private.collection_appearance_public() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('updated_at',a.updated_at,'appearance',case when
 (select published from public.collection_settings where singleton=true)
 and (a.appearance->>'starts_on' is null or (a.appearance->>'starts_on')::date<=(statement_timestamp() at time zone 'America/Monterrey')::date)
 and (a.appearance->>'ends_on' is null or (a.appearance->>'ends_on')::date>=(statement_timestamp() at time zone 'America/Monterrey')::date)
 then a.appearance else '{"preset": "arma", "colors": {"paper": "#f6f6f1", "ink": "#141414", "electric": "#2447f5", "acid": "#d7fc51", "coral": "#ff754a"}, "decoration": "none", "intensity": "subtle", "starts_on": null, "ends_on": null, "artwork_path": null, "background_path": null, "background_mode": "cover", "background_strength": 25, "background_tile_size": 360, "logo_path": null, "artwork_mode": "single", "artwork_height": 96, "artwork_position": "top"}'::jsonb end)
 from public.collection_appearance a where a.singleton=true;
$$;

create or replace function arma_private.save_collection_appearance(p_payload jsonb,p_expected timestamptz) returns void
language plpgsql security definer set search_path='' as $$
declare previous public.collection_appearance; path text; asset text;
begin
 if not arma_private.can_manage_collection() then raise exception 'Solo propietario y administrador pueden gestionar la colección.' using errcode='42501'; end if;
 select * into previous from public.collection_appearance where singleton=true for update;
 if previous.updated_at is distinct from p_expected then raise exception 'Otra persona actualizó la apariencia. Recarga antes de publicar.' using errcode='40001'; end if;
 if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'La configuración no es válida.'; end if;
 -- Older editors only submit seven fields. Keep the newer image settings in that case.
 p_payload:=previous.appearance||p_payload;
 if not arma_private.collection_appearance_valid(p_payload) then raise exception 'Revisa los colores, las imágenes, sus ajustes y las fechas.'; end if;
 foreach asset in array array['artwork_path','background_path','logo_path'] loop
  path:=p_payload->>asset;
  if path is not null and not exists(select 1 from storage.objects o where o.bucket_id='collection-artwork' and o.name=path
  and o.metadata->>'mimetype'='image/webp' and (o.metadata->>'size')::bigint between 1 and 524288) then raise exception 'Una imagen no está disponible o no cumple el formato y peso permitidos.'; end if;
 end loop;
 update public.collection_appearance set appearance=p_payload,updated_at=clock_timestamp(),updated_by=auth.uid() where singleton=true;
 insert into arma_private.collection_changes(actor_id,action,before_data,after_data) values(auth.uid(),'save_appearance',previous.appearance,p_payload);
end;$$;

-- Version 1 projections remain compatible with already deployed clients.
create or replace function public.get_collection_appearance() returns jsonb language sql stable set search_path='' as $$
 select jsonb_set(d,'{appearance}',(d->'appearance')-array['background_path','background_mode','background_strength','background_tile_size','logo_path','artwork_mode','artwork_height','artwork_position']::text[]) from (select arma_private.get_collection_appearance() as d) t;
$$;
create or replace function public.collection_appearance_public() returns jsonb language sql stable set search_path='' as $$
 select jsonb_set(d,'{appearance}',(d->'appearance')-array['background_path','background_mode','background_strength','background_tile_size','logo_path','artwork_mode','artwork_height','artwork_position']::text[]) from (select arma_private.collection_appearance_public() as d) t;
$$;
create function public.get_collection_appearance_v2() returns jsonb language sql stable set search_path='' as $$select arma_private.get_collection_appearance();$$;
create function public.collection_appearance_public_v2() returns jsonb language sql stable set search_path='' as $$select arma_private.collection_appearance_public();$$;
create function public.save_collection_appearance_v2(p_payload jsonb,p_expected timestamptz) returns void language sql set search_path='' as $$select arma_private.save_collection_appearance(p_payload,p_expected);$$;
revoke all on function public.get_collection_appearance_v2(),public.save_collection_appearance_v2(jsonb,timestamptz),public.collection_appearance_public_v2() from public,anon,authenticated;
grant execute on function public.get_collection_appearance_v2(),public.save_collection_appearance_v2(jsonb,timestamptz) to authenticated;
grant execute on function public.collection_appearance_public_v2() to anon,authenticated;

create or replace function arma_private.collection_artwork_visible(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(p_path=any(array[d->>'artwork_path',d->>'background_path',d->>'logo_path']),false)
 from (select arma_private.collection_appearance_public()->'appearance' as d) t;
$$;
create function arma_private.collection_artwork_referenced(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.collection_appearance a where a.singleton=true
 and p_path=any(array[a.appearance->>'artwork_path',a.appearance->>'background_path',a.appearance->>'logo_path']));
$$;
revoke all on function arma_private.collection_artwork_referenced(text) from public,anon,authenticated;
grant execute on function arma_private.collection_artwork_referenced(text) to authenticated;
drop policy collection_artwork_remove_unused on storage.objects;
create policy collection_artwork_remove_unused on storage.objects for delete to authenticated
using(bucket_id='collection-artwork' and (select arma_private.can_manage_collection())
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and not arma_private.collection_artwork_referenced(name));
