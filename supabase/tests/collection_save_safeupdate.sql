-- Uses a real owner session; all test changes are rolled back.
-- Also verify Guardar portada through PostgREST, whose authenticator preloads
-- safeupdate (SQL-editor sessions do not preload that library).
begin;
select set_config('request.jwt.claims',jsonb_build_object(
 'sub',ur.user_id,'role','authenticated','session_id',
 (select s.id from auth.sessions s where s.user_id=ur.user_id order by s.created_at desc limit 1)
)::text,true)
from public.user_roles ur join public.roles r on r.id=ur.role_id
where r.code='owner' and r.is_active limit 1;
set local role authenticated;
do $$
declare
 d jsonb; payload jsonb; featured jsonb; revision timestamptz;
 image_id uuid; blocked boolean;
begin
 assert arma_private.can_manage_collection(), 'Owner session required';
 d:=public.collection_admin_data();
 select jsonb_agg(item order by ord desc) into featured
 from jsonb_array_elements(d->'featured') with ordinality as t(item,ord);
 select i.id into image_id from public.product_images i
 where i.product_id=(featured->0->>'product_id')::uuid and i.archived_at is null
 order by i.id limit 1;
 assert image_id is not null, 'An active product photo is required';
 featured:=jsonb_set(featured,'{0,image_id}',to_jsonb(image_id));
 payload:=(d->'settings')||jsonb_build_object('featured',featured);
 revision:=(d->'settings'->>'updated_at')::timestamptz;
 perform public.save_collection(payload,revision);
 d:=public.collection_admin_data();
 assert (d->'settings'->>'updated_at')::timestamptz<>revision, 'Revision updated';
 assert (d->'featured'->0->>'product_id')=(featured->0->>'product_id'), 'Order saved';
 assert (d->'featured'->0->>'image_id')::uuid=image_id, 'Photo saved';
 assert jsonb_array_length(d->'featured')=4, 'Exactly four featured models';
 blocked:=false;
 begin
  perform public.save_collection(payload,revision);
 exception when serialization_failure then blocked:=true;
 end;
 assert blocked, 'Stale revision rejected';
 blocked:=false;
 begin
  perform public.save_collection(jsonb_set(payload,'{featured}',jsonb_build_array(featured->0,featured->0,featured->0,featured->0)),(d->'settings'->>'updated_at')::timestamptz);
 exception when raise_exception then blocked:=true;
 end;
 assert blocked, 'Duplicate models rejected';
end $$;
reset role;
rollback;
select 'PASS: authenticated save, order, photo, four slots, stale revision and duplicate checks; changes rolled back' as result;
