begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',ur.user_id,'role','authenticated','session_id',(select id from auth.sessions where user_id=ur.user_id order by created_at desc limit 1))::text,true)
from public.user_roles ur join public.roles r on r.id=ur.role_id where r.code='owner' and r.is_active limit 1;
set local role authenticated;
do $$
declare d jsonb; p jsonb; old_revision timestamptz; revision timestamptz; blocked boolean; today date:=(statement_timestamp() at time zone 'America/Monterrey')::date;
begin
 assert arma_private.can_manage_collection(),'Owner session ready';
 d:=public.get_collection_appearance_v2(); old_revision:=(d->>'updated_at')::timestamptz;
 p:=d->'appearance'||jsonb_build_object('preset','muertos','decoration','muertos','starts_on',null,'ends_on',null,'artwork_path',null);
 p:=jsonb_set(p,'{colors,electric}','"#4b175e"');
 perform public.save_collection_appearance_v2(p,old_revision);
 assert public.collection_appearance_public_v2()->'appearance'=p,'Published configuration projected';
 assert (select count(*) from jsonb_object_keys(public.get_collection_appearance()->'appearance'))=7,'Legacy admin contract preserved';
 assert (select count(*) from jsonb_object_keys(public.collection_appearance_public()->'appearance'))=7,'Legacy public contract preserved';

 blocked:=false;begin perform public.save_collection_appearance_v2(p,old_revision);exception when serialization_failure then blocked:=true;end;assert blocked,'Stale revision blocked';
 revision:=(public.get_collection_appearance_v2()->>'updated_at')::timestamptz;
 blocked:=false;begin perform public.save_collection_appearance_v2(jsonb_set(p,'{colors,electric}','"url(javascript:bad)"'),revision);exception when raise_exception then blocked:=true;end;assert blocked,'Unsafe CSS value blocked';
 blocked:=false;begin perform public.save_collection_appearance_v2(jsonb_set(p,'{colors,paper}','"#000000"'),revision);exception when raise_exception then blocked:=true;end;assert blocked,'Illegible paper blocked';
 blocked:=false;begin perform public.save_collection_appearance_v2(p||jsonb_build_object('html','<script>bad</script>'),revision);exception when raise_exception then blocked:=true;end;assert blocked,'Unknown fields blocked';
 blocked:=false;begin perform public.save_collection_appearance_v2(p||jsonb_build_object('starts_on','2026-02-30'),revision);exception when raise_exception then blocked:=true;end;assert blocked,'Invalid calendar date blocked';
 blocked:=false;begin perform public.save_collection_appearance_v2(p||jsonb_build_object('starts_on','2026-12-31','ends_on','2026-12-01'),revision);exception when raise_exception then blocked:=true;end;assert blocked,'Reversed dates blocked';
 blocked:=false;begin perform public.save_collection_appearance_v2(p||jsonb_build_object('artwork_path',auth.uid()::text||'/'||gen_random_uuid()::text||'.webp'),revision);exception when raise_exception then blocked:=true;end;assert blocked,'Missing artwork blocked';
 perform public.save_collection_appearance_v2(p||jsonb_build_object('starts_on',today+1),revision);
 assert public.collection_appearance_public_v2()->'appearance'->>'preset'='arma','Future season returns base';
 revision:=(public.get_collection_appearance_v2()->>'updated_at')::timestamptz;
 perform public.save_collection_appearance_v2(p||jsonb_build_object('ends_on',today-1),revision);
 assert public.collection_appearance_public_v2()->'appearance'->>'preset'='arma','Expired season returns base';
 revision:=(public.get_collection_appearance_v2()->>'updated_at')::timestamptz;
 perform public.save_collection_appearance_v2(p||jsonb_build_object('starts_on',today,'ends_on',today),revision);
 assert public.collection_appearance_public_v2()->'appearance'->>'preset'='muertos','Season dates inclusive';
end $$;
reset role;
update public.collection_settings set published=false where singleton=true;
do $$begin assert public.collection_preview()->>'published'='false','Private preview does not publish collection'; assert jsonb_array_length(public.collection_preview()->'items')>0,'Private preview available while unpublished'; assert public.collection_appearance_public_v2()->'appearance'->>'artwork_path' is null,'Unpublished artwork hidden';end $$;
set local role anon;
do $$begin
 assert not has_function_privilege(current_user,'public.collection_preview()','execute'),'Guest cannot read private preview';
 assert not has_function_privilege(current_user,'public.get_collection_appearance_v2()','execute'),'Guest cannot read draft settings';
 assert not has_function_privilege(current_user,'public.save_collection_appearance_v2(jsonb,timestamptz)','execute'),'Guest cannot publish';
 assert not has_table_privilege(current_user,'public.collection_appearance','select'),'Guest cannot read raw settings';
 assert public.collection_appearance_public_v2()->'appearance'->>'preset'='arma','Guest can read safe projection';
end $$;
reset role;
-- A seller remains blocked even when collection.manage is granted.
delete from public.user_roles where user_id=auth.uid();
insert into public.user_roles(user_id,role_id) select auth.uid(),id from public.roles where code='seller';
insert into public.role_permissions(role_id,permission_id) select r.id,p.id from public.roles r cross join public.permissions p where r.code='seller' and p.key='collection.manage' on conflict do nothing;
set local role authenticated;
do $$declare blocked boolean:=false;
begin
 assert not arma_private.can_manage_collection(),'Seller cannot manage despite permission';
 begin perform public.get_collection_appearance_v2(); exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'Seller read rejected';blocked:=false;
 begin perform public.collection_preview();exception when insufficient_privilege then blocked:=true;end;assert blocked,'Seller preview rejected';blocked:=false;
 begin perform public.save_collection_appearance_v2('{}',null); exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'Seller publish rejected';
end $$;
reset role;
rollback;
select 'PASS: v2 images/modes/limits, legacy contracts/save preservation, dates, CAS, private preview, guest/seller denial; rolled back' as result;
