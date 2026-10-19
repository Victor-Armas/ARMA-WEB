-- Public collection appearance. Drafts remain in the editor until explicit publish.
create function arma_private.collection_color_luminance(p_color text) returns double precision
language sql immutable set search_path='' as $$
 select sum(weight * case when channel <= 0.04045 then channel/12.92 else power((channel+0.055)/1.055,2.4) end)
 from (select (('x'||substr(p_color,i,2))::bit(8)::integer)/255.0 as channel,weight
 from (values(2,0.2126),(4,0.7152),(6,0.0722)) as c(i,weight)) as c;
$$;
revoke all on function arma_private.collection_color_luminance(text) from public,anon,authenticated;

create function arma_private.collection_appearance_valid(p jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare c text; d text;
begin
 if jsonb_typeof(p) is distinct from 'object' or (select count(*) from jsonb_object_keys(p))<>7
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
 return true;
exception when others then return false;
end;$$;
revoke all on function arma_private.collection_appearance_valid(jsonb) from public,anon,authenticated;

create table public.collection_appearance (
 singleton boolean primary key default true check(singleton),
 appearance jsonb not null check(arma_private.collection_appearance_valid(appearance)),
 updated_at timestamptz not null default clock_timestamp(),
 updated_by uuid references public.profiles(id)
);
alter table public.collection_appearance enable row level security;
revoke all on public.collection_appearance from public,anon,authenticated;
-- All reads and writes go through projections; direct access is intentionally denied.
create policy collection_appearance_no_direct_access on public.collection_appearance for all to authenticated using(false) with check(false);
insert into public.collection_appearance(singleton,appearance) values(true,'{"preset": "arma", "colors": {"paper": "#f6f6f1", "ink": "#141414", "electric": "#2447f5", "acid": "#d7fc51", "coral": "#ff754a"}, "decoration": "none", "intensity": "subtle", "starts_on": null, "ends_on": null, "artwork_path": null}'::jsonb);

create function arma_private.get_collection_appearance() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not arma_private.can_manage_collection() then raise exception 'Solo propietario y administrador pueden gestionar la colección.' using errcode='42501'; end if;
 return (select jsonb_build_object('appearance',appearance,'updated_at',updated_at) from public.collection_appearance where singleton=true);
end;$$;
create function public.get_collection_appearance() returns jsonb language sql stable set search_path='' as $$select arma_private.get_collection_appearance();$$;

create function arma_private.collection_appearance_public() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('updated_at',a.updated_at,'appearance',case when
 (select published from public.collection_settings where singleton=true)
 and (a.appearance->>'starts_on' is null or (a.appearance->>'starts_on')::date<=(statement_timestamp() at time zone 'America/Monterrey')::date)
 and (a.appearance->>'ends_on' is null or (a.appearance->>'ends_on')::date>=(statement_timestamp() at time zone 'America/Monterrey')::date)
 then a.appearance else '{"preset": "arma", "colors": {"paper": "#f6f6f1", "ink": "#141414", "electric": "#2447f5", "acid": "#d7fc51", "coral": "#ff754a"}, "decoration": "none", "intensity": "subtle", "starts_on": null, "ends_on": null, "artwork_path": null}'::jsonb end)
 from public.collection_appearance a where a.singleton=true;
$$;
create function public.collection_appearance_public() returns jsonb language sql stable set search_path='' as $$select arma_private.collection_appearance_public();$$;

create function arma_private.save_collection_appearance(p_payload jsonb,p_expected timestamptz) returns void
language plpgsql security definer set search_path='' as $$
declare previous public.collection_appearance; path text;
begin
 if not arma_private.can_manage_collection() then raise exception 'Solo propietario y administrador pueden gestionar la colección.' using errcode='42501'; end if;
 if not arma_private.collection_appearance_valid(p_payload) then raise exception 'Revisa los colores y las fechas. El fondo general debe ser claro y el color oscuro debe mantenerse oscuro.'; end if;
 select * into previous from public.collection_appearance where singleton=true for update;
 if previous.updated_at is distinct from p_expected then raise exception 'Otra persona actualizó la apariencia. Recarga antes de publicar.' using errcode='40001'; end if;
 path:=p_payload->>'artwork_path';
 if path is not null and not exists(select 1 from storage.objects o where o.bucket_id='collection-artwork' and o.name=path
 and o.metadata->>'mimetype'='image/webp' and (o.metadata->>'size')::bigint between 1 and 524288) then raise exception 'El adorno no está disponible o no cumple el formato y peso permitidos.'; end if;
 update public.collection_appearance set appearance=p_payload,updated_at=clock_timestamp(),updated_by=auth.uid() where singleton=true;
 insert into arma_private.collection_changes(actor_id,action,before_data,after_data) values(auth.uid(),'save_appearance',previous.appearance,p_payload);
end;$$;
create function public.save_collection_appearance(p_payload jsonb,p_expected timestamptz) returns void language sql set search_path='' as $$select arma_private.save_collection_appearance(p_payload,p_expected);$$;

revoke all on function arma_private.get_collection_appearance(),public.get_collection_appearance(),arma_private.save_collection_appearance(jsonb,timestamptz),public.save_collection_appearance(jsonb,timestamptz) from public,anon,authenticated;
grant execute on function arma_private.get_collection_appearance(),public.get_collection_appearance(),arma_private.save_collection_appearance(jsonb,timestamptz),public.save_collection_appearance(jsonb,timestamptz) to authenticated;
revoke all on function arma_private.collection_appearance_public(),public.collection_appearance_public() from public,anon,authenticated;
grant execute on function arma_private.collection_appearance_public(),public.collection_appearance_public() to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('collection-artwork','collection-artwork',false,524288,array['image/webp']) on conflict(id) do nothing;
create function arma_private.collection_artwork_visible(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((arma_private.collection_appearance_public()->'appearance'->>'artwork_path')=p_path,false);
$$;
revoke all on function arma_private.collection_artwork_visible(text) from public,anon,authenticated;
grant execute on function arma_private.collection_artwork_visible(text) to anon,authenticated;
create policy collection_artwork_public_read on storage.objects for select to anon,authenticated
using(bucket_id='collection-artwork' and (select arma_private.collection_artwork_visible(name)));
create policy collection_artwork_admin_read on storage.objects for select to authenticated
using(bucket_id='collection-artwork' and (select arma_private.can_manage_collection()));
create policy collection_artwork_admin_upload on storage.objects for insert to authenticated
with check(bucket_id='collection-artwork' and (select arma_private.can_manage_collection())
 and (storage.foldername(name))[1]=(select auth.uid())::text and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$');
create policy collection_artwork_remove_unused on storage.objects for delete to authenticated
using(bucket_id='collection-artwork' and (select arma_private.can_manage_collection())
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and (arma_private.get_collection_appearance()->'appearance'->>'artwork_path') is distinct from name);
