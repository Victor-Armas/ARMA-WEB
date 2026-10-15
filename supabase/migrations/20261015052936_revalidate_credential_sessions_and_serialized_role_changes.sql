alter table arma_private.user_security add column operation_session uuid;
CREATE OR REPLACE FUNCTION public.service_prepare_credential(p_actor uuid, p_session uuid, p_target uuid, p_action text, p_operation uuid, p_digest text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_state arma_private.user_security;v_email text;
begin
 if p_action='change_password' then
  if p_actor<>p_target or not arma_private.session_valid(p_actor,p_session) then raise exception 'Sesión no válida.' using errcode='42501';end if;
 else perform public.service_authorize_user_action(p_actor,p_session,p_action,case when p_action='create' then null else p_target end,case when p_action='create' then array['seller'] else null end);end if;
 perform pg_advisory_xact_lock(hashtextextended('arma-team-roles',0));
 insert into arma_private.user_security(user_id,requires_password_change) values(p_target,true) on conflict do nothing;
 select * into v_state from arma_private.user_security where user_id=p_target for update;
 if v_state.operation_until>now() then raise exception 'Hay una operación en curso. Espera un momento y reintenta.';end if;
 if p_action='change_password' then
  if not v_state.requires_password_change or v_state.temporary_expires_at is null or v_state.temporary_expires_at<=now() then raise exception 'La contraseña temporal venció. Solicita un restablecimiento.';end if;
  if p_digest is null or v_state.temporary_digest is distinct from p_digest then raise exception 'La contraseña temporal no es correcta.';end if;
 else
  update arma_private.user_security set requires_password_change=true,temporary_digest=null,temporary_expires_at=null,sessions_valid_from=now(),updated_at=now() where user_id=p_target;
 end if;
 if p_action='reset' and not arma_private.control_available() then raise exception 'Debe permanecer una cuenta activa para gestionar permisos.';end if;
 update arma_private.user_security set operation_id=p_operation,operation_actor=p_actor,operation_session=p_session,operation_action=p_action,operation_until=now()+interval '90 seconds' where user_id=p_target;
 select email into v_email from auth.users where id=p_target;
 return jsonb_build_object('email',v_email);
end;$function$
;
CREATE OR REPLACE FUNCTION arma_private.set_role_permissions(p_role text, p_keys text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_role uuid;v_before text[];begin
 perform pg_advisory_xact_lock(hashtextextended('arma-team-roles',0));
 if not public.has_commerce_permission('team.permissions.edit') then raise exception 'No tienes permiso para editar permisos.' using errcode='42501';end if;
 if p_role is null or p_role not in ('owner','admin','seller') or p_keys is null or cardinality(p_keys)>40 or exists(select 1 from unnest(p_keys) x where x is null or not exists(select 1 from public.permissions p where p.key=x and p.is_active)) then raise exception 'Permisos inválidos.';end if;
 
 select id into v_role from public.roles where code=p_role and is_active;
 select coalesce(array_agg(p.key),array[]::text[]) into v_before from public.role_permissions rp join public.permissions p on p.id=rp.permission_id where rp.role_id=v_role and p.is_active;
 delete from public.role_permissions where role_id=v_role;
 insert into public.role_permissions(role_id,permission_id) select v_role,id from public.permissions where key=any(p_keys) and is_active;
 if not arma_private.control_available() then raise exception 'Conserva una cuenta activa con acceso a Equipo y edición de permisos.';end if;
 insert into arma_private.permission_changes(actor_id,role_code,previous_keys,new_keys) values(auth.uid(),p_role,v_before,p_keys);
 end;$function$
;
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
 if not arma_private.session_valid(p_actor,v_state.operation_session) then raise exception 'La sesión ya no es válida.' using errcode='42501';end if;
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
   if p_roles is null or cardinality(p_roles)<1 or cardinality(p_roles)>3 or exists(select 1 from unnest(p_roles) x where x is null or x not in ('seller','admin','owner')) then raise exception 'Roles inválidos.';end if;
   update public.profiles set full_name=p_full_name,phone=nullif(p_phone,''),updated_at=now() where id=p_target;
   insert into public.user_roles(user_id,role_id,assigned_by) select p_target,r.id,p_actor from public.roles r where r.is_active and r.code=any(p_roles) on conflict do nothing;
  end if;
  v_expires:=now()+interval '24 hours';
  update arma_private.user_security set temporary_digest=p_digest,temporary_expires_at=v_expires,operation_id=null,operation_until=null,updated_at=now() where user_id=p_target;
 end if;
 insert into arma_private.user_admin_audit(actor_id,user_id,action) values(p_actor,p_target,v_state.operation_action);
 return jsonb_build_object('expires_at',v_expires);
end;$function$
;
CREATE OR REPLACE FUNCTION public.service_edit_member(p_actor uuid, p_session uuid, p_target uuid, p_full_name text, p_phone text, p_roles text[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_before text[];
begin
 perform pg_advisory_xact_lock(hashtextextended('arma-team-roles',0));
 perform public.service_authorize_user_action(p_actor,p_session,'edit',p_target,p_roles);
 
 if length(trim(p_full_name))<2 or length(p_full_name)>120 or length(coalesce(p_phone,''))>30 then raise exception 'Revisa el nombre y teléfono.';end if;
 select coalesce(array_agg(r.code),array[]::text[]) into v_before from public.user_roles u join public.roles r on r.id=u.role_id where u.user_id=p_target and r.is_active;
 update public.profiles set full_name=trim(p_full_name),phone=nullif(trim(p_phone),''),updated_at=now() where id=p_target;
 delete from public.user_roles where user_id=p_target;
 insert into public.user_roles(user_id,role_id,assigned_by) select p_target,id,p_actor from public.roles where code=any(p_roles) and is_active;
 if not arma_private.control_available() then raise exception 'Debe permanecer una cuenta activa para gestionar permisos.';end if;
 insert into arma_private.role_changes(actor_id,user_id,previous_roles,new_roles) values(p_actor,p_target,v_before,p_roles);
 insert into arma_private.user_admin_audit(actor_id,user_id,action) values(p_actor,p_target,'edit');
 return p_target;
end;$function$
;
CREATE OR REPLACE FUNCTION public.service_set_member_active(p_actor uuid, p_session uuid, p_target uuid, p_active boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 perform pg_advisory_xact_lock(hashtextextended('arma-team-roles',0));
 perform public.service_authorize_user_action(p_actor,p_session,case when p_active then 'enable' else 'disable' end,p_target);
 
 update public.profiles set is_active=p_active,updated_at=now() where id=p_target;
 if not arma_private.control_available() then raise exception 'Debe permanecer una cuenta activa para gestionar permisos.';end if;
 update arma_private.user_security set sessions_valid_from=now(),updated_at=now() where user_id=p_target;
 insert into arma_private.user_admin_audit(actor_id,user_id,action) values(p_actor,p_target,case when p_active then 'enable' else 'disable' end);
 return p_target;
end;$function$
;

