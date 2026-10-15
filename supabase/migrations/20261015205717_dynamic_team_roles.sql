CREATE OR REPLACE FUNCTION arma_private.set_member_roles(p_user_id uuid, p_roles text[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_actor uuid:=auth.uid();v_owner boolean;v_before text[];v_roles text[];
begin
 if v_actor is null or not public.has_commerce_permission('team.manage_sellers') then raise exception 'No tienes permiso para gestionar roles.' using errcode='42501';end if;
 v_owner:=public.has_commerce_permission('team.manage_all');
 if p_roles is null or cardinality(p_roles)>32 or exists(select 1 from unnest(p_roles) x where x is null or not exists(select 1 from public.roles r where r.code=x and r.is_active)) then raise exception 'Roles inválidos.';end if;
 select coalesce(array_agg(distinct x),array[]::text[]) into v_roles from unnest(p_roles) x;
 perform pg_advisory_xact_lock(hashtextextended('arma-team-roles',0));
 perform 1 from public.profiles where id=p_user_id for update;
 if not found then raise exception 'Cuenta no encontrada.';end if;
 select coalesce(array_agg(r.code),array[]::text[]) into v_before from public.user_roles u join public.roles r on r.id=u.role_id where u.user_id=p_user_id and r.is_active;
 if not v_owner and (exists(select 1 from unnest(v_roles) x where x<>'seller') or exists(select 1 from unnest(v_before) x where x<>'seller')) then raise exception 'Solo el propietario puede gestionar cuentas de administración.' using errcode='42501';end if;
 if 'owner'=any(v_before) and not('owner'=any(v_roles)) and not exists(select 1 from public.user_roles u join public.roles r on r.id=u.role_id join public.profiles p on p.id=u.user_id where r.code='owner' and r.is_active and p.is_active and u.user_id<>p_user_id) then raise exception 'ARMA debe conservar al menos un propietario activo.';end if;
 delete from public.user_roles where user_id=p_user_id;
 insert into public.user_roles(user_id,role_id,assigned_by) select p_user_id,id,v_actor from public.roles where code=any(v_roles) and is_active;
 insert into arma_private.role_changes(actor_id,user_id,previous_roles,new_roles) values(v_actor,p_user_id,v_before,v_roles);
 return p_user_id;
end;$function$;


CREATE OR REPLACE FUNCTION public.service_authorize_user_action(p_actor uuid, p_session uuid, p_action text, p_target uuid DEFAULT NULL::uuid, p_roles text[] DEFAULT NULL::text[])
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_key text;v_admin boolean;v_target_admin boolean;
begin
 if not arma_private.account_ready(p_actor,p_session) then raise exception 'La sesión no tiene acceso a la aplicación.' using errcode='42501';end if;
 v_key:=case p_action when 'create' then 'team.users.create' when 'edit' then 'team.users.edit' when 'reset' then 'team.users.reset' when 'disable' then 'team.users.disable' when 'enable' then 'team.users.disable' else null end;
 if v_key is null or not arma_private.user_has_permission(p_actor,v_key) then raise exception 'No tienes permiso para esta operación.' using errcode='42501';end if;
 select exists(select 1 from public.user_roles u join public.roles r on r.id=u.role_id where u.user_id=p_actor and r.is_active and r.code in ('admin','owner')) into v_admin;
 if p_roles is not null and (cardinality(p_roles)<1 or cardinality(p_roles)>32 or exists(select 1 from unnest(p_roles) x where x is null or not exists(select 1 from public.roles r where r.code=x and r.is_active))) then raise exception 'Selecciona roles válidos.';end if;
 if not v_admin and ((p_roles is not null and exists(select 1 from unnest(p_roles) x where x<>'seller')) or exists(select 1 from public.user_roles u join public.roles r on r.id=u.role_id where u.user_id=p_target and r.is_active and r.code<>'seller')) then raise exception 'Esta cuenta requiere permisos de administración.' using errcode='42501';end if;
 if p_action='create' and not arma_private.user_has_permission(p_actor,'team.users.edit') and p_roles<>array['seller'] then raise exception 'Solo puedes crear cuentas de vendedor.' using errcode='42501';end if;
 if p_action in ('reset','disable') and p_target=p_actor then raise exception 'Esta acción se realiza sobre otras cuentas del equipo.';end if;
 if p_target is not null and not exists(select 1 from public.profiles where id=p_target) then raise exception 'Cuenta no encontrada.';end if;
 if p_action in ('reset','disable') and not arma_private.control_available(p_target) then raise exception 'Debe permanecer una cuenta activa para gestionar permisos.';end if;
 return true;
end;$function$;


CREATE OR REPLACE FUNCTION arma_private.role_permissions_config()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if not public.has_commerce_permission('team.read') then raise exception 'No tienes acceso al equipo.' using errcode='42501';end if;
 return jsonb_build_object('permissions',(select jsonb_agg(jsonb_build_object('key',p.key,'module',p.module,'label',p.description) order by p.module,p.key) from public.permissions p where p.is_active),'roles',(select jsonb_agg(jsonb_build_object('code',r.code,'name',r.name,'description',coalesce(r.description,''),'keys',coalesce((select jsonb_agg(p.key order by p.key) from public.role_permissions rp join public.permissions p on p.id=rp.permission_id where rp.role_id=r.id and p.is_active),'[]'::jsonb)) order by r.code) from public.roles r where r.is_active));end;$function$;


CREATE OR REPLACE FUNCTION arma_private.set_role_permissions(p_role text, p_keys text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_role uuid;v_before text[];begin
 perform pg_advisory_xact_lock(hashtextextended('arma-team-roles',0));
 if not public.has_commerce_permission('team.permissions.edit') then raise exception 'No tienes permiso para editar permisos.' using errcode='42501';end if;
 if p_role is null or not exists(select 1 from public.roles r where r.code=p_role and r.is_active) or p_keys is null or cardinality(p_keys)>100 or exists(select 1 from unnest(p_keys) x where x is null or not exists(select 1 from public.permissions p where p.key=x and p.is_active)) then raise exception 'Permisos inválidos.';end if;
 
 select id into v_role from public.roles where code=p_role and is_active;
 select coalesce(array_agg(p.key),array[]::text[]) into v_before from public.role_permissions rp join public.permissions p on p.id=rp.permission_id where rp.role_id=v_role and p.is_active;
 delete from public.role_permissions where role_id=v_role;
 insert into public.role_permissions(role_id,permission_id) select v_role,id from public.permissions where key=any(p_keys) and is_active;
 if not arma_private.control_available() then raise exception 'Conserva una cuenta activa con acceso a Equipo y edición de permisos.';end if;
 insert into arma_private.permission_changes(actor_id,role_code,previous_keys,new_keys) values(auth.uid(),p_role,v_before,p_keys);
 end;$function$;


CREATE OR REPLACE FUNCTION public.service_finish_credential(p_actor uuid, p_target uuid, p_operation uuid, p_digest text DEFAULT NULL::text, p_roles text[] DEFAULT NULL::text[], p_full_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_state arma_private.user_security;v_expires timestamptz;v_key text;
begin
 perform pg_advisory_xact_lock(hashtextextended('arma-team-roles',0));
 select * into v_state from arma_private.user_security where user_id=p_target for update;
 if not found or v_state.operation_id is distinct from p_operation or v_state.operation_actor is distinct from p_actor or v_state.operation_until<=now() then raise exception 'La operación ya no es válida. Reintenta el restablecimiento.';end if;
 -- Auth revokes the temporary session when admin.updateUserById changes its password.
 -- Finish its already-verified lease only if the account and its security cutoff remain unchanged.
 if v_state.operation_action='change_password' then
  if not exists(select 1 from public.profiles where id=p_actor and is_active) or v_state.sessions_valid_from is distinct from v_state.operation_valid_from then raise exception 'La cuenta cambió durante la operación. Solicita un restablecimiento.' using errcode='42501';end if;
 elsif not arma_private.account_ready(p_actor,v_state.operation_session) then raise exception 'La sesión ya no es válida.' using errcode='42501';end if;
 if v_state.operation_action<>'change_password' then perform public.service_authorize_user_action(p_actor,v_state.operation_session,v_state.operation_action,case when v_state.operation_action='create' then null else p_target end,p_roles);end if;
 if v_state.operation_action='change_password' then
  if v_state.temporary_expires_at<=now() then raise exception 'La contraseña temporal venció.';end if;
  update arma_private.user_security set requires_password_change=false,temporary_digest=null,temporary_expires_at=null,sessions_valid_from=now(),operation_id=null,operation_until=null,updated_at=now() where user_id=p_target;
 else
  v_key:=case v_state.operation_action when 'create' then 'team.users.create' when 'reset' then 'team.users.reset' else null end;
  if v_key is null or not arma_private.user_has_permission(p_actor,v_key) or p_digest is null or p_digest!~'^[a-f0-9]{64}$' then raise exception 'Operación no permitida.' using errcode='42501';end if;
  if v_state.operation_action='create' then
   if not exists(select 1 from public.user_roles u join public.roles r on r.id=u.role_id where u.user_id=p_actor and r.is_active and r.code in ('owner','admin')) and p_roles&&array['owner','admin'] then raise exception 'No puedes asignar estos roles.' using errcode='42501';end if;
   if not arma_private.user_has_permission(p_actor,'team.users.edit') and p_roles<>array['seller'] then raise exception 'Solo puedes crear vendedores.';end if;
   if p_roles is null or cardinality(p_roles)<1 or cardinality(p_roles)>32 or exists(select 1 from unnest(p_roles) x where x is null or not exists(select 1 from public.roles r where r.code=x and r.is_active)) then raise exception 'Roles inválidos.';end if;
   update public.profiles set full_name=p_full_name,phone=nullif(p_phone,''),updated_at=now() where id=p_target;
   insert into public.user_roles(user_id,role_id,assigned_by) select p_target,r.id,p_actor from public.roles r where r.is_active and r.code=any(p_roles) on conflict do nothing;
  end if;
  v_expires:=now()+interval '24 hours';
  update arma_private.user_security set temporary_digest=p_digest,temporary_expires_at=v_expires,operation_id=null,operation_until=null,updated_at=now() where user_id=p_target;
 end if;
 insert into arma_private.user_admin_audit(actor_id,user_id,action) values(p_actor,p_target,v_state.operation_action);
 return jsonb_build_object('expires_at',v_expires);
end;$function$;



create or replace function arma_private.create_team_role(p_request_id uuid,p_name text,p_description text default '') returns text
language plpgsql security definer set search_path='' as $$
declare v_code text;v_existing public.roles;begin
 perform pg_advisory_xact_lock(hashtextextended('arma-team-roles',0));
 if not public.has_commerce_permission('team.permissions.edit') then raise exception 'No tienes permiso para crear roles.' using errcode='42501';end if;
 if p_request_id is null or p_name is null or length(trim(p_name))<2 or length(trim(p_name))>60 or length(coalesce(p_description,''))>250 then raise exception 'Revisa el nombre y la descripción del rol.';end if;
 v_code:='custom_'||replace(p_request_id::text,'-','');
 select * into v_existing from public.roles where code=v_code;
 if found then
  if v_existing.name is distinct from trim(p_name) or coalesce(v_existing.description,'') is distinct from trim(coalesce(p_description,'')) then raise exception 'El intento anterior usó otros datos. Cierra el formulario e inténtalo de nuevo.';end if;
  return v_code;
 end if;
 if exists(select 1 from public.roles where lower(trim(name))=lower(trim(p_name))) then raise exception 'Ya existe un rol con ese nombre.';end if;
 insert into public.roles(code,name,description) values(v_code,trim(p_name),nullif(trim(p_description),''));
 insert into arma_private.permission_changes(actor_id,role_code,previous_keys,new_keys) values(auth.uid(),v_code,array[]::text[],array[]::text[]);
 return v_code;
end;$$;
revoke all on function arma_private.create_team_role(uuid,text,text) from public,anon,authenticated;
grant execute on function arma_private.create_team_role(uuid,text,text) to authenticated;
create or replace function public.create_team_role(p_request_id uuid,p_name text,p_description text default '') returns text
language sql security invoker set search_path='' as $$select arma_private.create_team_role(p_request_id,p_name,p_description);$$;
revoke all on function public.create_team_role(uuid,text,text) from public,anon;
grant execute on function public.create_team_role(uuid,text,text) to authenticated;
