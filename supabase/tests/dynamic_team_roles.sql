begin;
do $$
declare a uuid:=gen_random_uuid();u uuid:=gen_random_uuid();s uuid:=gen_random_uuid();req uuid:=gen_random_uuid();op uuid:=gen_random_uuid();v_code text;j jsonb;blocked boolean;begin
 insert into auth.users(id,email) values(a,a::text||'@example.invalid'),(u,u::text||'@example.invalid'),(s,s::text||'@example.invalid');
 update arma_private.user_security set requires_password_change=false,sessions_valid_from=null where user_id in(a,u,s);
 insert into public.user_roles(user_id,role_id) select a,id from public.roles where code='admin' on conflict do nothing;
 insert into public.user_roles(user_id,role_id) select s,id from public.roles where code='seller' on conflict do nothing;
 -- Give the isolated actor explicit permissions without altering existing roles.
 insert into public.roles(code,name) values('test_'||req::text,'TEST role creation permissions');
 insert into public.role_permissions(role_id,permission_id) select r.id,p.id from public.roles r cross join public.permissions p where r.code='test_'||req::text and p.key in ('team.read','team.permissions.edit','team.users.edit','team.users.create');
 insert into public.user_roles(user_id,role_id) select a,id from public.roles where code='test_'||req::text;
 execute 'set local role authenticated';perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 v_code:=public.create_team_role(req,'TEST Producción '||req::text,'Personal de taller');
 if public.create_team_role(req,'TEST Producción '||req::text,'Personal de taller')<>v_code then raise exception 'retry created another role';end if;
 j:=public.role_permissions_config();
 if not exists(select 1 from jsonb_array_elements(j->'roles') r where r->>'code'=v_code and r->>'name'='TEST Producción '||req::text and r->'keys'='[]'::jsonb) then raise exception 'new role missing or starts with permissions';end if;
 blocked:=false;begin perform public.create_team_role(gen_random_uuid(),'test producción '||req::text,'');exception when raise_exception then blocked:=true;end;if not blocked then raise exception 'duplicate name accepted';end if;
 perform public.set_role_permissions(v_code,array['products.read','sales.read']);
 execute 'reset role';
 perform public.service_authorize_user_action(a,null,'create',null,array[v_code]);
 perform public.service_prepare_credential(a,null,u,'create',op,null);
 perform public.service_finish_credential(a,u,op,repeat('a',64),array[v_code],'TEST Personal','');
 if not exists(select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.user_id=u and r.code=v_code) then raise exception 'credential creation did not assign custom role';end if;
 update arma_private.user_security set requires_password_change=false,sessions_valid_from=null where user_id=u;
 perform public.service_edit_member(a,null,u,'TEST Edited','',array[v_code,'seller']);
 execute 'set local role authenticated';perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
 j:=public.app_access();if not(j->'roles' ? v_code) or not(j->'permissions' ? 'products.read') then raise exception 'custom permissions unavailable';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',s,'role','authenticated')::text,true);
 blocked:=false;begin perform public.create_team_role(gen_random_uuid(),'TEST Unauthorized','');exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'seller created role';end if;
 blocked:=false;begin perform public.set_role_permissions(v_code,array['team.permissions.edit']);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'seller changed permissions';end if;
 execute 'reset role';
 blocked:=false;begin perform public.service_authorize_user_action(a,null,'edit',u,array['does_not_exist']);exception when raise_exception then blocked:=true;end;if not blocked then raise exception 'unknown role accepted';end if;
 -- Even a delegated seller account must not assign privileged custom roles.
 insert into public.role_permissions(role_id,permission_id) select r.id,p.id from public.roles r cross join public.permissions p where r.code='seller' and p.key='team.users.edit' on conflict do nothing;
 blocked:=false;begin perform public.service_authorize_user_action(s,null,'edit',s,array[v_code]);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'seller assigned custom role';end if;
end;$$;
rollback;
