insert into public.permissions(key,module,action,description) values ('products.read','Productos','products.read','Ver productos'),('products.manage','Productos','products.manage','Entrar a Gestión de productos'),('products.create','Productos','products.create','Crear productos'),('products.edit','Productos','products.edit','Editar productos y fotografías'),('products.hide','Productos','products.hide','Ocultar o reactivar productos'),('sales.read','Ventas','sales.read','Consultar ventas'),('sales.create','Ventas','sales.create','Crear ventas'),('sales.complete','Apartados','sales.complete','Completar venta de un apartado'),('reservations.read','Apartados','reservations.read','Ver apartados'),('reservations.create','Apartados','reservations.create','Crear apartados'),('reservations.cancel','Apartados','reservations.cancel','Cancelar apartados'),('reservations.deliver','Apartados','reservations.deliver','Marcar como entregado'),('reservations.edit_delivery','Apartados','reservations.edit_delivery','Cambiar compromiso de entrega'),('commerce.read_all','Alcance','commerce.read_all','Consultar registros de todo el equipo'),('commerce.manage_all','Alcance','commerce.manage_all','Administrar apartados de todo el equipo'),('materials.read','Materia prima','materials.read','Ver materia prima'),('materials.create','Materia prima','materials.create','Crear materia prima'),('materials.edit','Materia prima','materials.edit','Editar materia prima y fotografías'),('materials.hide','Materia prima','materials.hide','Ocultar o reactivar materia prima'),('team.read','Equipo','team.read','Entrar a Equipo'),('team.users.create','Equipo','team.users.create','Crear usuarios'),('team.users.edit','Equipo','team.users.edit','Editar usuarios y roles'),('team.users.reset','Equipo','team.users.reset','Restablecer contraseñas'),('team.users.disable','Equipo','team.users.disable','Deshabilitar o reactivar usuarios'),('team.permissions.edit','Equipo','team.permissions.edit','Editar permisos de los roles') on conflict(key) do update set module=excluded.module,action=excluded.action,description=excluded.description,is_active=true;
update public.permissions set is_active=false where key not in ('products.read','products.manage','products.create','products.edit','products.hide','sales.read','sales.create','sales.complete','reservations.read','reservations.create','reservations.cancel','reservations.deliver','reservations.edit_delivery','commerce.read_all','commerce.manage_all','materials.read','materials.create','materials.edit','materials.hide','team.read','team.users.create','team.users.edit','team.users.reset','team.users.disable','team.permissions.edit');
delete from public.role_permissions where role_id in(select id from public.roles where code in ('admin','owner','seller'));
insert into public.role_permissions(role_id,permission_id) select r.id,p.id from public.roles r cross join public.permissions p where r.code in ('owner','admin') and p.is_active;
insert into public.role_permissions(role_id,permission_id) select r.id,p.id from public.roles r cross join public.permissions p where r.code='seller' and p.key in ('products.read','sales.read','sales.create','sales.complete','reservations.read','reservations.create','reservations.cancel','reservations.deliver','reservations.edit_delivery');
create table arma_private.user_security (
 user_id uuid primary key references auth.users(id) on delete cascade,
 requires_password_change boolean not null default true,
 temporary_digest text,temporary_expires_at timestamptz,
 sessions_valid_from timestamptz,
 operation_id uuid,operation_actor uuid,operation_action text,operation_until timestamptz,
 updated_at timestamptz not null default now()
);
alter table arma_private.user_security enable row level security;
revoke all on arma_private.user_security from public,anon,authenticated;
insert into arma_private.user_security(user_id,requires_password_change) select id,false from public.profiles;

create function arma_private.user_has_permission(p_user uuid,p_key text) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.profiles pr join public.user_roles ur on ur.user_id=pr.id join public.roles r on r.id=ur.role_id join public.role_permissions rp on rp.role_id=r.id join public.permissions p on p.id=rp.permission_id where pr.id=p_user and pr.is_active and r.is_active and p.is_active and p.key=p_key);
$$;
create function arma_private.session_valid(p_user uuid,p_session uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.profiles pr left join arma_private.user_security s on s.user_id=pr.id where pr.id=p_user and pr.is_active and (s.sessions_valid_from is null or exists(select 1 from auth.sessions a where a.id=p_session and a.user_id=p_user and a.created_at>=s.sessions_valid_from)));
$$;
create function arma_private.account_ready(p_user uuid,p_session uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select arma_private.session_valid(p_user,p_session) and not exists(select 1 from arma_private.user_security where user_id=p_user and requires_password_change);
$$;
create function arma_private.actor_ready() returns boolean language sql stable security definer set search_path='' as $$
 select arma_private.account_ready(auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid);
$$;
revoke all on function arma_private.user_has_permission(uuid,text),arma_private.session_valid(uuid,uuid),arma_private.account_ready(uuid,uuid),arma_private.actor_ready() from public,anon,authenticated;
grant execute on function arma_private.actor_ready() to authenticated;
create or replace function public.has_commerce_permission(p_key text) returns boolean language sql stable security invoker set search_path='' as $$
 select arma_private.actor_ready() and exists(select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id join public.role_permissions rp on rp.role_id=r.id join public.permissions p on p.id=rp.permission_id where ur.user_id=auth.uid() and r.is_active and p.is_active and p.key=p_key);
$$;
create function arma_private.account_gate() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('is_active',coalesce(pr.is_active,false),'requires_change',coalesce(s.requires_password_change,false),
 'expired',coalesce(s.requires_password_change and (s.temporary_expires_at is null or s.temporary_expires_at<=now()),false),
 'expires_at',s.temporary_expires_at,'session_valid',arma_private.session_valid(auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid))
 from (select auth.uid() id) a left join public.profiles pr on pr.id=a.id left join arma_private.user_security s on s.user_id=a.id;
$$;
revoke all on function arma_private.account_gate() from public,anon;
grant execute on function arma_private.account_gate() to authenticated;
create function public.account_gate() returns jsonb language sql stable security invoker set search_path='' as $$select arma_private.account_gate();$$;
revoke all on function public.account_gate() from public,anon;
grant execute on function public.account_gate() to authenticated;

create table arma_private.user_admin_audit(id bigint generated always as identity primary key,actor_id uuid not null references auth.users(id),user_id uuid references auth.users(id),action text not null,created_at timestamptz not null default now());
alter table arma_private.user_admin_audit enable row level security;
revoke all on arma_private.user_admin_audit from public,anon,authenticated;
create function arma_private.control_available(p_exclude uuid default null) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.profiles pr left join arma_private.user_security s on s.user_id=pr.id where pr.is_active and pr.id is distinct from p_exclude and not coalesce(s.requires_password_change,false) and arma_private.user_has_permission(pr.id,'team.read') and arma_private.user_has_permission(pr.id,'team.permissions.edit'));
$$;
revoke all on function arma_private.control_available(uuid) from public,anon,authenticated;

create function public.service_authorize_user_action(p_actor uuid,p_session uuid,p_action text,p_target uuid default null,p_roles text[] default null) returns boolean language plpgsql security definer set search_path='' as $$
declare v_key text;v_admin boolean;v_target_admin boolean;
begin
 if not arma_private.account_ready(p_actor,p_session) then raise exception 'La sesión no tiene acceso a la aplicación.' using errcode='42501';end if;
 v_key:=case p_action when 'create' then 'team.users.create' when 'edit' then 'team.users.edit' when 'reset' then 'team.users.reset' when 'disable' then 'team.users.disable' when 'enable' then 'team.users.disable' else null end;
 if v_key is null or not arma_private.user_has_permission(p_actor,v_key) then raise exception 'No tienes permiso para esta operación.' using errcode='42501';end if;
 select exists(select 1 from public.user_roles u join public.roles r on r.id=u.role_id where u.user_id=p_actor and r.is_active and r.code in ('admin','owner')) into v_admin;
 if p_roles is not null and (cardinality(p_roles)<1 or cardinality(p_roles)>3 or exists(select 1 from unnest(p_roles) x where x is null or x not in ('seller','admin','owner'))) then raise exception 'Selecciona roles válidos.';end if;
 if not v_admin and ((p_roles is not null and p_roles&&array['admin','owner']) or exists(select 1 from public.user_roles u join public.roles r on r.id=u.role_id where u.user_id=p_target and r.is_active and r.code in ('admin','owner'))) then raise exception 'Esta cuenta requiere permisos de administración.' using errcode='42501';end if;
 if p_action='create' and not arma_private.user_has_permission(p_actor,'team.users.edit') and p_roles<>array['seller'] then raise exception 'Solo puedes crear cuentas de vendedor.' using errcode='42501';end if;
 if p_action in ('reset','disable') and p_target=p_actor then raise exception 'Esta acción se realiza sobre otras cuentas del equipo.';end if;
 if p_target is not null and not exists(select 1 from public.profiles where id=p_target) then raise exception 'Cuenta no encontrada.';end if;
 if p_action in ('reset','disable') and not arma_private.control_available(p_target) then raise exception 'Debe permanecer una cuenta activa para gestionar permisos.';end if;
 return true;
end;$$;

create function public.service_prepare_credential(p_actor uuid,p_session uuid,p_target uuid,p_action text,p_operation uuid,p_digest text default null) returns jsonb language plpgsql security definer set search_path='' as $$
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
 update arma_private.user_security set operation_id=p_operation,operation_actor=p_actor,operation_action=p_action,operation_until=now()+interval '90 seconds' where user_id=p_target;
 select email into v_email from auth.users where id=p_target;
 return jsonb_build_object('email',v_email);
end;$$;

create function public.service_finish_credential(p_actor uuid,p_target uuid,p_operation uuid,p_digest text default null,p_roles text[] default null,p_full_name text default null,p_phone text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_state arma_private.user_security;v_expires timestamptz;v_key text;
begin
 select * into v_state from arma_private.user_security where user_id=p_target for update;
 if not found or v_state.operation_id is distinct from p_operation or v_state.operation_actor is distinct from p_actor or v_state.operation_until<=now() then raise exception 'La operación ya no es válida. Reintenta el restablecimiento.';end if;
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
end;$$;
create function public.service_abort_credential(p_operation uuid) returns void language sql security definer set search_path='' as $$update arma_private.user_security set operation_id=null,operation_until=null where operation_id=p_operation;$$;

create function public.service_edit_member(p_actor uuid,p_session uuid,p_target uuid,p_full_name text,p_phone text,p_roles text[]) returns uuid language plpgsql security definer set search_path='' as $$
declare v_before text[];
begin
 perform public.service_authorize_user_action(p_actor,p_session,'edit',p_target,p_roles);
 perform pg_advisory_xact_lock(hashtextextended('arma-team-roles',0));
 if length(trim(p_full_name))<2 or length(p_full_name)>120 or length(coalesce(p_phone,''))>30 then raise exception 'Revisa el nombre y teléfono.';end if;
 select coalesce(array_agg(r.code),array[]::text[]) into v_before from public.user_roles u join public.roles r on r.id=u.role_id where u.user_id=p_target and r.is_active;
 update public.profiles set full_name=trim(p_full_name),phone=nullif(trim(p_phone),''),updated_at=now() where id=p_target;
 delete from public.user_roles where user_id=p_target;
 insert into public.user_roles(user_id,role_id,assigned_by) select p_target,id,p_actor from public.roles where code=any(p_roles) and is_active;
 if not arma_private.control_available() then raise exception 'Debe permanecer una cuenta activa para gestionar permisos.';end if;
 insert into arma_private.role_changes(actor_id,user_id,previous_roles,new_roles) values(p_actor,p_target,v_before,p_roles);
 insert into arma_private.user_admin_audit(actor_id,user_id,action) values(p_actor,p_target,'edit');
 return p_target;
end;$$;
create function public.service_set_member_active(p_actor uuid,p_session uuid,p_target uuid,p_active boolean) returns uuid language plpgsql security definer set search_path='' as $$
begin
 perform public.service_authorize_user_action(p_actor,p_session,case when p_active then 'enable' else 'disable' end,p_target);
 perform pg_advisory_xact_lock(hashtextextended('arma-team-roles',0));
 update public.profiles set is_active=p_active,updated_at=now() where id=p_target;
 if not arma_private.control_available() then raise exception 'Debe permanecer una cuenta activa para gestionar permisos.';end if;
 update arma_private.user_security set sessions_valid_from=now(),updated_at=now() where user_id=p_target;
 insert into arma_private.user_admin_audit(actor_id,user_id,action) values(p_actor,p_target,case when p_active then 'enable' else 'disable' end);
 return p_target;
end;$$;
revoke all on function public.service_authorize_user_action(uuid,uuid,text,uuid,text[]),public.service_prepare_credential(uuid,uuid,uuid,text,uuid,text),public.service_finish_credential(uuid,uuid,uuid,text,text[],text,text),public.service_abort_credential(uuid),public.service_edit_member(uuid,uuid,uuid,text,text,text[]),public.service_set_member_active(uuid,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.service_authorize_user_action(uuid,uuid,text,uuid,text[]),public.service_prepare_credential(uuid,uuid,uuid,text,uuid,text),public.service_finish_credential(uuid,uuid,uuid,text,text[],text,text),public.service_abort_credential(uuid),public.service_edit_member(uuid,uuid,uuid,text,text,text[]),public.service_set_member_active(uuid,uuid,uuid,boolean) to service_role;

create or replace function public.handle_new_auth_user() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.profiles(id,full_name) values(new.id,nullif(trim(coalesce(new.raw_user_meta_data->>'full_name','')),''));insert into arma_private.user_security(user_id) values(new.id);return new;end;$$;

create or replace function public.app_access() returns jsonb language sql stable set search_path='' as $$select jsonb_build_object('roles',coalesce((select jsonb_agg(r.code order by r.code) from public.user_roles u join public.roles r on r.id=u.role_id where u.user_id=auth.uid() and r.is_active and arma_private.actor_ready()),'[]'::jsonb),'permissions',coalesce((select jsonb_agg(distinct p.key) from public.user_roles u join public.roles r on r.id=u.role_id join public.role_permissions rp on rp.role_id=r.id join public.permissions p on p.id=rp.permission_id where u.user_id=auth.uid() and r.is_active and p.is_active and arma_private.actor_ready()),'[]'::jsonb));$$;
create or replace function public.can_read_inventory() returns boolean language sql stable set search_path='' as $$select public.has_commerce_permission('materials.read') or public.has_commerce_permission('products.manage');$$;
create or replace function public.commerce_permissions() returns jsonb language sql stable set search_path='' as $$select jsonb_build_object('read',public.has_commerce_permission('sales.read') or public.has_commerce_permission('reservations.read'),'write',public.has_commerce_permission('sales.create') or public.has_commerce_permission('reservations.create'),'read_all',public.has_commerce_permission('commerce.read_all'),'manage_all',public.has_commerce_permission('commerce.manage_all'));$$;
alter policy commerce_orders_read on public.commerce_orders using (public.has_commerce_permission(case when kind='sale' then 'sales.read' else 'reservations.read' end) and (created_by=auth.uid() or public.has_commerce_permission('commerce.read_all')));
alter policy commerce_items_read on public.commerce_order_items using (exists(select 1 from public.commerce_orders o where o.id=order_id));
alter policy profiles_select_own on public.profiles using (auth.uid()=id and arma_private.actor_ready());
alter policy profiles_update_own on public.profiles using (auth.uid()=id and arma_private.actor_ready()) with check (auth.uid()=id and arma_private.actor_ready());
revoke execute on function public.set_member_roles(uuid,text[]),arma_private.set_member_roles(uuid,text[]) from authenticated;
create or replace function arma_private.team_members() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not public.has_commerce_permission('team.read') then raise exception 'No tienes acceso al equipo.' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name,'phone',p.phone,'email',u.email,'is_active',p.is_active,'requires_change',coalesce(s.requires_password_change,false),'temporary_expires_at',s.temporary_expires_at,'roles',coalesce((select jsonb_agg(r.code order by r.code) from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.user_id=p.id and r.is_active),'[]'::jsonb)) order by p.full_name,p.id) from public.profiles p join auth.users u on u.id=p.id left join arma_private.user_security s on s.user_id=p.id),'[]'::jsonb);end;$$;
create table arma_private.permission_changes(id bigint generated always as identity primary key,actor_id uuid not null references auth.users(id),role_code text not null,previous_keys text[] not null,new_keys text[] not null,created_at timestamptz not null default now());
alter table arma_private.permission_changes enable row level security;
revoke all on arma_private.permission_changes from public,anon,authenticated;
create function arma_private.role_permissions_config() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not public.has_commerce_permission('team.read') then raise exception 'No tienes acceso al equipo.' using errcode='42501';end if;
 return jsonb_build_object('permissions',(select jsonb_agg(jsonb_build_object('key',p.key,'module',p.module,'label',p.description) order by p.module,p.key) from public.permissions p where p.is_active),'roles',(select jsonb_agg(jsonb_build_object('code',r.code,'keys',coalesce((select jsonb_agg(p.key order by p.key) from public.role_permissions rp join public.permissions p on p.id=rp.permission_id where rp.role_id=r.id and p.is_active),'[]'::jsonb)) order by r.code) from public.roles r where r.is_active and r.code in ('seller','admin','owner')));end;$$;
create function arma_private.set_role_permissions(p_role text,p_keys text[]) returns void language plpgsql security definer set search_path='' as $$declare v_role uuid;v_before text[];begin
 if not public.has_commerce_permission('team.permissions.edit') then raise exception 'No tienes permiso para editar permisos.' using errcode='42501';end if;
 if p_role is null or p_role not in ('owner','admin','seller') or p_keys is null or cardinality(p_keys)>40 or exists(select 1 from unnest(p_keys) x where x is null or not exists(select 1 from public.permissions p where p.key=x and p.is_active)) then raise exception 'Permisos inválidos.';end if;
 perform pg_advisory_xact_lock(hashtextextended('arma-team-roles',0));
 select id into v_role from public.roles where code=p_role and is_active;
 select coalesce(array_agg(p.key),array[]::text[]) into v_before from public.role_permissions rp join public.permissions p on p.id=rp.permission_id where rp.role_id=v_role and p.is_active;
 delete from public.role_permissions where role_id=v_role;
 insert into public.role_permissions(role_id,permission_id) select v_role,id from public.permissions where key=any(p_keys) and is_active;
 if not arma_private.control_available() then raise exception 'Conserva una cuenta activa con acceso a Equipo y edición de permisos.';end if;
 insert into arma_private.permission_changes(actor_id,role_code,previous_keys,new_keys) values(auth.uid(),p_role,v_before,p_keys);
 end;$$;
create function public.role_permissions_config() returns jsonb language sql set search_path='' as $$select arma_private.role_permissions_config();$$;
create function public.set_role_permissions(p_role text,p_keys text[]) returns void language sql set search_path='' as $$select arma_private.set_role_permissions(p_role,p_keys);$$;
revoke all on function arma_private.role_permissions_config(),arma_private.set_role_permissions(text,text[]),public.role_permissions_config(),public.set_role_permissions(text,text[]) from public,anon;
grant execute on function arma_private.role_permissions_config(),arma_private.set_role_permissions(text,text[]),public.role_permissions_config(),public.set_role_permissions(text,text[]) to authenticated;
CREATE OR REPLACE FUNCTION public.commerce_orders_page(p_kind text, p_page integer DEFAULT 1, p_search text DEFAULT ''::text, p_status text DEFAULT ''::text, p_delivery text DEFAULT ''::text, p_period text DEFAULT 'all'::text, p_seller uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare v_today date:=(now() at time zone 'America/Monterrey')::date;v_delivery date;v_result jsonb;v_digits text;
begin
 if not public.has_commerce_permission(case when p_kind='sale' then 'sales.read' else 'reservations.read' end) then raise exception 'Tu cuenta no tiene permiso para consultar ventas y apartados.' using errcode='42501'; end if;
 if p_kind is null or p_kind not in ('sale','reservation') or p_page is null or p_page not between 1 and 1000000 or p_search is null or length(p_search)>120 or p_status is null or p_status not in ('','active','cancelled','fulfilled','completed') or p_delivery is null or p_period is null or p_period not in ('all','today','week','month') then raise exception 'Filtro inválido.'; end if;
 if p_seller is not null and not public.has_commerce_permission('commerce.read_all') then raise exception 'No puedes filtrar registros de otro vendedor.' using errcode='42501'; end if;
 if p_delivery not in ('','overdue','unscheduled') then v_delivery:=p_delivery::date; end if;
 v_digits:=regexp_replace(p_search,'[^0-9]','','g');
 with base as materialized (
 select o.* from public.commerce_orders o where o.kind=p_kind and (p_seller is null or o.created_by=p_seller) and (p_status='' or o.status=p_status)
 and (p_kind='reservation' or p_period='all' or (p_period='today' and o.created_at>=(v_today::timestamp at time zone 'America/Monterrey'))
 or (p_period='week' and o.created_at>=(date_trunc('week',v_today::timestamp) at time zone 'America/Monterrey'))
 or (p_period='month' and o.created_at>=now()-interval '30 days'))
 and (trim(p_search)='' or strpos(lower(o.customer_name),lower(trim(p_search)))>0 or strpos(lpad(o.order_number::text,4,'0'),trim(p_search))>0
 or (length(v_digits)>=3 and p_search!~'[[:alpha:]]' and (strpos(regexp_replace(o.customer_phone,'[^0-9]','','g'),v_digits)>0 or (length(v_digits)>=10 and right(regexp_replace(o.customer_phone,'[^0-9]','','g'),10)=right(v_digits,10))))
 or exists(select 1 from public.commerce_order_items i where i.order_id=o.id and strpos(lower(i.product_name||' '||i.sku),lower(trim(p_search)))>0))
 ), matched as materialized (
 select * from base where p_delivery='' or (status in ('active','fulfilled') and delivered_at is null and ((p_delivery='overdue' and delivery_date<v_today) or (p_delivery='unscheduled' and delivery_date is null) or delivery_date=v_delivery))
 ), stats as(select count(*) total,greatest(1,least(p_page,ceil(count(*)/12.0)::integer)) page from matched),
 selected as(select * from matched order by created_at desc,id desc limit 12 offset(select (page-1)*12 from stats)),
 active as materialized(select o.*,(select sum(quantity) from public.commerce_order_items i where i.order_id=o.id) pieces from base o where status in ('active','fulfilled') and delivered_at is null),
 schedule as(select delivery_date,count(*) orders,sum(pieces) pieces from active where delivery_date>=v_today group by delivery_date order by delivery_date limit 7),
 sale_totals as(select count(*) orders,coalesce(sum(total),0) revenue,coalesce(avg(total),0) average_ticket,
 coalesce(sum((select sum(quantity) from public.commerce_order_items i where i.order_id=o.id)),0) pieces,
 coalesce(sum((select sum(greatest(catalog_price-unit_price,0)*quantity) from public.commerce_order_items i where i.order_id=o.id)),0) discounts,
 coalesce(sum(o.applied_deposit),0) applied_deposits from base o),
 payment_totals as(select payment_method method,count(*) orders,sum(total-o.applied_deposit) amount from base o group by payment_method)
 select jsonb_build_object('total',s.total,'page',s.page,'items',coalesce((select jsonb_agg(to_jsonb(o)||jsonb_build_object(
 'items',(select jsonb_agg(to_jsonb(i)||jsonb_build_object('cover_path',(
 select case when pi.thumbnail_path is not null and exists(select 1 from storage.objects so where so.bucket_id=pi.storage_bucket and so.name=pi.thumbnail_path) then pi.thumbnail_path else pi.storage_path end
 from public.product_images pi where pi.product_id=i.product_id and pi.is_cover order by pi.sort_order limit 1
 )) order by i.id) from public.commerce_order_items i where i.order_id=o.id),
 'source_deposit',o.applied_deposit
 ) order by o.created_at desc,o.id desc) from selected o),'[]'::jsonb),
 'delivery_summary',jsonb_build_object('scheduled',coalesce((select jsonb_agg(jsonb_build_object('date',delivery_date,'orders',orders,'pieces',pieces) order by delivery_date) from schedule),'[]'::jsonb),
 'overdue_orders',(select count(*) from active where delivery_date<v_today),'overdue_pieces',coalesce((select sum(pieces) from active where delivery_date<v_today),0),
 'unscheduled_orders',(select count(*) from active where delivery_date is null),'unscheduled_pieces',coalesce((select sum(pieces) from active where delivery_date is null),0)),
 'sales_summary',(select to_jsonb(t)||jsonb_build_object('payments',coalesce((select jsonb_agg(jsonb_build_object('method',method,'orders',orders,'amount',amount) order by amount desc) from payment_totals),'[]'::jsonb)) from sale_totals t)
 ) into v_result from stats s;
 return v_result;
end;
$function$
;
CREATE OR REPLACE FUNCTION arma_private.create_commerce_order(p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_actor uuid:=auth.uid(); v_id uuid; v_kind text; v_quantity integer; v_price numeric; v_deposit numeric;
 v_name text; v_phone text; v_notes text; v_method text; v_date date; v_delivery date; v_variant public.product_variants; v_balance public.inventory_balances;
 v_product public.products; v_existing public.commerce_orders; v_seller text;
begin
 if v_actor is null or not public.has_commerce_permission(case when p_payload->>'kind'='sale' then 'sales.create' else 'reservations.create' end) then raise exception 'Tu cuenta no tiene permiso para registrar ventas o apartados.' using errcode='42501'; end if;
 v_id:=(p_payload->>'request_id')::uuid;
 if v_id is null then raise exception 'Falta el identificador de la operación.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 select * into v_existing from public.commerce_orders where id=v_id;
 if found then
  if v_existing.created_by<>v_actor then raise exception 'Operación no disponible.' using errcode='42501'; end if;
  return v_existing.id;
 end if;
 v_kind:=p_payload->>'kind'; v_quantity:=(p_payload->>'quantity')::integer;
 v_price:=(p_payload->>'unit_price')::numeric; v_deposit:=coalesce((p_payload->>'deposit')::numeric,0);
 v_name:=trim(coalesce(p_payload->>'customer_name','')); v_phone:=trim(coalesce(p_payload->>'customer_phone','')); v_notes:=trim(coalesce(p_payload->>'notes',''));
 v_method:=nullif(p_payload->>'payment_method',''); v_date:=nullif(p_payload->>'due_date','')::date; v_delivery:=nullif(p_payload->>'delivery_date','')::date;
 if v_kind is null or v_kind not in ('sale','reservation') or v_quantity is null or v_quantity not between 1 and 10000 then raise exception 'Cantidad o tipo de operación inválidos.'; end if;
 if v_price is null or v_price::text in ('NaN','Infinity','-Infinity') or v_price<=0 or v_price>999999 or v_price<>round(v_price,2) or v_deposit::text in ('NaN','Infinity','-Infinity') or v_deposit<>round(v_deposit,2) or v_deposit<0 or v_deposit>v_price*v_quantity then raise exception 'Revisa el precio y el anticipo.'; end if;
 if length(v_name)>120 or length(v_phone)>30 or length(v_notes)>1000 then raise exception 'El nombre, teléfono o las notas son demasiado largos.'; end if;
 if v_kind='reservation' and v_name='' then raise exception 'Escribe el nombre del cliente del apartado.'; end if;
 if v_method is not null and v_method not in ('cash','transfer','card') then raise exception 'Forma de pago inválida.'; end if;
 if (v_kind='sale' or v_deposit>0) and v_method is null then raise exception 'Selecciona la forma de pago.'; end if;
 if v_kind='sale' and (v_deposit<>0 or v_date is not null or v_delivery is not null) then raise exception 'Una venta no necesita anticipo ni fecha límite.'; end if;
 if v_date is not null and v_date<(now() at time zone 'America/Monterrey')::date then raise exception 'La fecha límite no puede estar en el pasado.'; end if;
 if v_delivery is not null and v_delivery<(now() at time zone 'America/Monterrey')::date then raise exception 'La fecha de entrega no puede estar en el pasado.'; end if;
 select pv.* into v_variant from public.product_variants pv where pv.id=(p_payload->>'variant_id')::uuid and pv.is_active for share;
 if not found or v_variant.currency<>'MXN' or upper(trim(v_variant.size)) not in ('S','M','L') then raise exception 'Esta variante no está disponible para venta.'; end if;
 select * into v_product from public.products where id=v_variant.product_id and is_active for share;
 if not found then raise exception 'El producto ya no está activo.'; end if;
 select b.* into v_balance from public.inventory_balances b join public.inventory_locations l on l.id=b.location_id
 where b.product_variant_id=v_variant.id and l.is_default and l.is_active for update of b;
 if not found or v_balance.available_quantity<v_quantity then raise exception 'Ya no hay suficientes piezas disponibles. Actualiza el producto.' using errcode='P0001'; end if;
 select full_name into v_seller from public.profiles where id=v_actor and is_active;
 insert into public.commerce_orders(id,kind,status,customer_name,customer_phone,notes,total,deposit,payment_method,due_date,delivery_date,created_by,seller_name)
 values(v_id,v_kind,case when v_kind='sale' then 'completed' else 'active' end,v_name,v_phone,v_notes,v_price*v_quantity,v_deposit,v_method,v_date,v_delivery,v_actor,coalesce(v_seller,'Personal ARMA'));
 insert into public.commerce_order_items(order_id,product_variant_id,inventory_balance_id,product_id,product_name,sku,size,color,quantity,catalog_price,unit_price)
 values(v_id,v_variant.id,v_balance.id,v_product.id,v_product.name,v_variant.sku,v_variant.size,v_variant.color,v_quantity,v_variant.sale_price,v_price);
 update public.inventory_balances set physical_quantity=physical_quantity-case when v_kind='sale' then v_quantity else 0 end,
 reserved_quantity=reserved_quantity+case when v_kind='reservation' then v_quantity else 0 end,updated_at=now() where id=v_balance.id;
 insert into public.inventory_movements(inventory_balance_id,movement_type,physical_delta,reserved_delta,reason,created_by,commerce_order_id)
 values(v_balance.id,case when v_kind='sale' then 'sale' else 'reservation' end,case when v_kind='sale' then -v_quantity else 0 end,
 case when v_kind='reservation' then v_quantity else 0 end,case when v_kind='sale' then 'Venta registrada' else 'Apartado registrado' end,v_actor,v_id);
 return v_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION arma_private.mark_reservation_delivered(p_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or not public.has_commerce_permission('reservations.deliver') then raise exception 'Tu cuenta no tiene permiso para confirmar entregas.' using errcode='42501'; end if;
 perform 1 from public.commerce_orders where id=p_id and kind='reservation' and (created_by=auth.uid() or public.has_commerce_permission('commerce.manage_all')) and status='fulfilled' for update;
 if not found then raise exception 'Completa el cobro del apartado antes de confirmar su entrega.'; end if;
 update public.commerce_orders set delivered_at=coalesce(delivered_at,now()) where id=p_id;
 return p_id;
end; $function$
;
CREATE OR REPLACE FUNCTION arma_private.resolve_reservation(p_id uuid, p_action text, p_request_id uuid, p_payment_method text, p_refund_confirmed boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_actor uuid:=auth.uid(); v_order public.commerce_orders; v_item public.commerce_order_items; v_balance public.inventory_balances; v_seller text;
begin
 if v_actor is null or not public.has_commerce_permission(case when p_action='complete' then 'sales.complete' else 'reservations.cancel' end) then raise exception 'Tu cuenta no tiene permiso para administrar apartados.' using errcode='42501'; end if;
 if p_action is null or p_action not in ('complete','cancel') then raise exception 'Acción inválida.'; end if;
 select * into v_order from public.commerce_orders where id=p_id and kind='reservation' for update;
 if not found or (v_order.created_by<>v_actor and not public.has_commerce_permission('commerce.manage_all')) then raise exception 'Apartado no encontrado.'; end if;
 if v_order.status='fulfilled' and p_action='complete' then return v_order.sale_id; end if;
 if v_order.status='cancelled' and p_action='cancel' then return v_order.id; end if;
 if v_order.status<>'active' then raise exception 'Este apartado ya fue cerrado. Actualiza el listado.'; end if;
 if p_action='complete' and (p_request_id is null or p_payment_method is null or p_payment_method not in ('cash','transfer','card')) then raise exception 'Selecciona la forma de pago del saldo.'; end if;
 if p_action='cancel' and v_order.deposit>0 and not coalesce(p_refund_confirmed,false) then raise exception 'Confirma la devolución del anticipo antes de cancelar.'; end if;
 if p_action='complete' then
  select full_name into v_seller from public.profiles where id=v_actor;
  insert into public.commerce_orders(id,kind,status,customer_name,customer_phone,notes,total,deposit,payment_method,created_by,seller_name,source_reservation_id,applied_deposit)
  values(p_request_id,'sale','completed',v_order.customer_name,v_order.customer_phone,v_order.notes,v_order.total,0,p_payment_method,v_actor,coalesce(v_seller,'Personal ARMA'),p_id,v_order.deposit);
 end if;
 for v_item in select * from public.commerce_order_items where order_id=p_id order by inventory_balance_id loop
  select * into v_balance from public.inventory_balances where id=v_item.inventory_balance_id for update;
  if not found or v_balance.reserved_quantity<v_item.quantity or v_balance.physical_quantity<v_item.quantity then raise exception 'El inventario del apartado requiere revisión.'; end if;
  update public.inventory_balances set physical_quantity=physical_quantity-case when p_action='complete' then v_item.quantity else 0 end,
  reserved_quantity=reserved_quantity-v_item.quantity,updated_at=now() where id=v_balance.id;
  insert into public.inventory_movements(inventory_balance_id,movement_type,physical_delta,reserved_delta,reason,created_by,commerce_order_id)
  values(v_balance.id,case when p_action='complete' then 'sale' else 'reservation_release' end,case when p_action='complete' then -v_item.quantity else 0 end,
  -v_item.quantity,case when p_action='complete' then 'Venta de apartado' else 'Cancelación de apartado' end,v_actor,case when p_action='complete' then p_request_id else p_id end);
  if p_action='complete' then
   insert into public.commerce_order_items(order_id,product_variant_id,inventory_balance_id,product_id,product_name,sku,size,color,quantity,catalog_price,unit_price)
   values(p_request_id,v_item.product_variant_id,v_item.inventory_balance_id,v_item.product_id,v_item.product_name,v_item.sku,v_item.size,v_item.color,v_item.quantity,v_item.catalog_price,v_item.unit_price);
  end if;
 end loop;
 update public.commerce_orders set status=case when p_action='complete' then 'fulfilled' else 'cancelled' end,closed_at=now(),closed_by=v_actor,
 sale_id=case when p_action='complete' then p_request_id else null end,refunded_amount=case when p_action='cancel' then deposit else 0 end where id=p_id;
 return case when p_action='complete' then p_request_id else p_id end;
end;
$function$
;
CREATE OR REPLACE FUNCTION arma_private.set_reservation_delivery_date(p_id uuid, p_date date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_actor uuid:=auth.uid();
begin
 if v_actor is null or not public.has_commerce_permission('reservations.edit_delivery') then raise exception 'Tu cuenta no tiene permiso para programar entregas.' using errcode='42501'; end if;
 if p_date is not null and p_date<(now() at time zone 'America/Monterrey')::date then raise exception 'La fecha de entrega no puede estar en el pasado.'; end if;
 perform 1 from public.commerce_orders where id=p_id and kind='reservation' and (created_by=auth.uid() or public.has_commerce_permission('commerce.manage_all')) and status in ('active','fulfilled') and delivered_at is null for update;
 if not found then raise exception 'Solo puedes programar apartados pendientes de entrega.'; end if;
 update public.commerce_orders set delivery_date=p_date where id=p_id;
 return p_id;
end;
$function$
;
alter table public.products add column created_by uuid references auth.users(id);
alter table public.materials add column created_by uuid references auth.users(id);

create function arma_private.catalog_admin_page(p_kind text,p_page int default 1,p_search text default '',p_state text default 'active') returns jsonb language plpgsql stable security definer set search_path='' as $$declare v_result jsonb;begin
 if p_kind not in ('product','material') or p_kind is null or not public.has_commerce_permission(case when p_kind='product' then 'products.manage' else 'materials.read' end) then raise exception 'No tienes acceso a esta sección.' using errcode='42501';end if;
 if p_page is null or p_page not between 1 and 1000000 or p_search is null or length(p_search)>120 or p_state is null or p_state not in ('all','active','hidden') then raise exception 'Filtro inválido.';end if;
 if p_kind='product' then
 with matched as materialized(select p.* from public.products p where (p_state='all' or p.is_active=(p_state='active')) and (trim(p_search)='' or strpos(lower(p.name||' '||p.code||' '||coalesce(p.description,'')),lower(trim(p_search)))>0)),
 stats as(select count(*) total,greatest(1,least(p_page,ceil(count(*)/12.0)::int)) page from matched),selected as(select * from matched order by name,id limit 12 offset(select (page-1)*12 from stats))
 select jsonb_build_object('total',s.total,'page',s.page,'items',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('kind','product','variants',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('available',(select coalesce(sum(b.available_quantity),0) from public.inventory_balances b where b.product_variant_id=v.id)) order by v.sku) from public.product_variants v where v.product_id=p.id),'[]'::jsonb),'images',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'storage_path',i.storage_path,'alt_text',i.alt_text,'caption',i.caption) order by i.is_cover desc,i.sort_order) from public.product_images i where i.product_id=p.id),'[]'::jsonb)) order by p.name,p.id) from selected p),'[]'::jsonb)) into v_result from stats s;
 else
 with matched as materialized(select p.* from public.materials p where (p_state='all' or p.is_active=(p_state='active')) and (trim(p_search)='' or strpos(lower(p.name||' '||p.code||' '||coalesce(p.description,'')),lower(trim(p_search)))>0)),
 stats as(select count(*) total,greatest(1,least(p_page,ceil(count(*)/12.0)::int)) page from matched),selected as(select * from matched order by name,id limit 12 offset(select (page-1)*12 from stats))
 select jsonb_build_object('total',s.total,'page',s.page,'items',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('kind','material','variants',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('available',(select coalesce(sum(b.available_quantity),0) from public.inventory_balances b where b.material_variant_id=v.id)) order by v.sku) from public.material_variants v where v.material_id=p.id),'[]'::jsonb),'images',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'storage_path',i.storage_path,'alt_text',i.alt_text,'caption',i.caption) order by i.is_cover desc,i.sort_order) from public.material_images i where i.material_id=p.id),'[]'::jsonb)) order by p.name,p.id) from selected p),'[]'::jsonb)) into v_result from stats s;
 end if;
 return v_result;end;$$;
create function arma_private.save_product(p_payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare 
 v_id uuid:=(p_payload->>'id')::uuid;v_new boolean;v_code text:=trim(p_payload->>'code');v_name text:=trim(p_payload->>'name');v_desc text:=trim(coalesce(p_payload->>'description',''));v_variant jsonb;v_vid uuid;v_sku text;v_size text;v_color text;v_min int;v_price numeric;v_location uuid;v_type text;v_width numeric;v_height numeric;
 begin

 if v_id is null then raise exception 'Falta el identificador.';end if;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 perform 1 from public.products where id=v_id for update;v_new:=not found;
 if not public.has_commerce_permission(case when v_new then 'products.create' else 'products.edit' end) then raise exception 'No tienes permiso para guardar este registro.' using errcode='42501';end if;
 if v_name is null or length(v_name) not between 2 and 120 or v_code is null or length(v_code) not between 2 and 50 or v_code!~'^[A-Za-z0-9_-]+$' or length(v_desc)>2000 or jsonb_typeof(p_payload->'variants') is distinct from 'array' or jsonb_array_length(p_payload->'variants') not between 1 and 30 then raise exception 'Revisa nombre, código y variantes.';end if;
 select id into v_location from public.inventory_locations where is_default and is_active;
 if v_location is null then raise exception 'No hay una ubicación predeterminada.';end if;
insert into public.products(id,code,name,description,created_by) values(v_id,upper(v_code),v_name,nullif(v_desc,''),auth.uid()) on conflict(id) do update set code=excluded.code,name=excluded.name,description=excluded.description,updated_at=now();

 for v_variant in select value from jsonb_array_elements(p_payload->'variants') loop
 v_vid:=(v_variant->>'id')::uuid;v_sku:=trim(v_variant->>'sku');v_size:=trim(coalesce(v_variant->>'size',''));v_color:=trim(coalesce(v_variant->>'color',''));v_min:=(v_variant->>'minimum_stock')::int;
 if v_vid is null or v_sku is null or length(v_sku) not between 2 and 80 or length(v_size)>20 or length(v_color)>80 or v_min is null or v_min not between 0 and 100000 or length(coalesce(v_variant->>'description',''))>1000 then raise exception 'Revisa los datos de las variantes.';end if;
 if exists(select 1 from public.product_variants where id=v_vid and product_id<>v_id) then raise exception 'Esta variante pertenece a otro registro.';end if;

 if v_size not in ('S','M','L') and not exists(select 1 from public.product_variants where id=v_vid and product_id=v_id and size=v_size) then raise exception 'Las nuevas variantes deben ser Chica, Mediana o Grande.';end if;
 v_price:=(v_variant->>'sale_price')::numeric;if v_color='' or v_price is null or v_price::text in ('NaN','Infinity','-Infinity') or v_price<=0 or v_price>999999 or v_price<>round(v_price,2) then raise exception 'Revisa color y precio.';end if;
 insert into public.product_variants(id,product_id,sku,size,color,description,sale_price,minimum_stock) values(v_vid,v_id,upper(v_sku),v_size,v_color,nullif(trim(v_variant->>'description'),''),v_price,v_min) on conflict(id) do update set sku=excluded.sku,size=excluded.size,color=excluded.color,description=excluded.description,sale_price=excluded.sale_price,minimum_stock=excluded.minimum_stock,updated_at=now();

 if not exists(select 1 from public.inventory_balances where product_variant_id=v_vid and location_id=v_location) then insert into public.inventory_balances(location_id,product_variant_id) values(v_location,v_vid);end if;
 end loop;return v_id;end;$$;
 create function arma_private.set_product_active(p_id uuid,p_active boolean) returns void language plpgsql security definer set search_path='' as $$begin
 if p_active is null or not public.has_commerce_permission('products.hide') then raise exception 'No tienes permiso para ocultar o reactivar.' using errcode='42501';end if;
 update public.products set is_active=p_active,updated_at=now() where id=p_id;if not found then raise exception 'Registro no encontrado.';end if;end;$$;
 create or replace function arma_private.attach_product_image(p_id uuid,p_path text) returns uuid language plpgsql security definer set search_path='' as $$declare v_image uuid;begin
 if not (public.has_commerce_permission('products.edit') or (public.has_commerce_permission('products.create') and exists(select 1 from public.products where id=p_id and created_by=auth.uid()))) then raise exception 'No tienes permiso para agregar fotografías.' using errcode='42501';end if;
 perform 1 from public.products where id=p_id and is_active for update;if not found then raise exception 'Registro no disponible.';end if;
 if p_path is null or p_path!~('^products/'||p_id::text||'/[0-9a-f-]{36}\.(png|jpg|webp)$') or not exists(select 1 from storage.objects o where o.bucket_id='inventory-images' and o.name=p_path and o.owner_id=auth.uid()::text) then raise exception 'La fotografía no pertenece a esta operación.';end if;
 insert into public.product_images(product_id,storage_path,alt_text,sort_order,is_cover) select p_id,p_path,m.name,(select count(*) from public.product_images where product_id=p_id),not exists(select 1 from public.product_images where product_id=p_id) from public.products m where m.id=p_id returning id into v_image;return v_image;end;$$;
 create function public.save_product(p_payload jsonb) returns uuid language sql set search_path='' as $$select arma_private.save_product(p_payload);$$;
 create function public.set_product_active(p_id uuid,p_active boolean) returns void language sql set search_path='' as $$select arma_private.set_product_active(p_id,p_active);$$;
 create or replace function public.attach_product_image(p_id uuid,p_path text) returns uuid language sql set search_path='' as $$select arma_private.attach_product_image(p_id,p_path);$$;
 revoke all on function arma_private.save_product(jsonb),arma_private.set_product_active(uuid,boolean),arma_private.attach_product_image(uuid,text),public.save_product(jsonb),public.set_product_active(uuid,boolean),public.attach_product_image(uuid,text) from public,anon;
 grant execute on function arma_private.save_product(jsonb),arma_private.set_product_active(uuid,boolean),arma_private.attach_product_image(uuid,text),public.save_product(jsonb),public.set_product_active(uuid,boolean),public.attach_product_image(uuid,text) to authenticated;
create function arma_private.save_material(p_payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare 
 v_id uuid:=(p_payload->>'id')::uuid;v_new boolean;v_code text:=trim(p_payload->>'code');v_name text:=trim(p_payload->>'name');v_desc text:=trim(coalesce(p_payload->>'description',''));v_variant jsonb;v_vid uuid;v_sku text;v_size text;v_color text;v_min int;v_price numeric;v_location uuid;v_type text;v_width numeric;v_height numeric;
 begin

 if v_id is null then raise exception 'Falta el identificador.';end if;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 perform 1 from public.materials where id=v_id for update;v_new:=not found;
 if not public.has_commerce_permission(case when v_new then 'materials.create' else 'materials.edit' end) then raise exception 'No tienes permiso para guardar este registro.' using errcode='42501';end if;
 if v_name is null or length(v_name) not between 2 and 120 or v_code is null or length(v_code) not between 2 and 50 or v_code!~'^[A-Za-z0-9_-]+$' or length(v_desc)>2000 or jsonb_typeof(p_payload->'variants') is distinct from 'array' or jsonb_array_length(p_payload->'variants') not between 1 and 30 then raise exception 'Revisa nombre, código y variantes.';end if;
 select id into v_location from public.inventory_locations where is_default and is_active;
 if v_location is null then raise exception 'No hay una ubicación predeterminada.';end if;
v_type:=p_payload->>'material_type';if v_type is null or v_type not in ('blank_shirt','dtf_transfer') then raise exception 'Tipo de insumo inválido.';end if;
if not v_new and exists(select 1 from public.materials where id=v_id and material_type<>v_type) then raise exception 'El tipo de un insumo existente no se modifica.';end if;
insert into public.materials(id,code,name,description,material_type,created_by) values(v_id,upper(v_code),v_name,nullif(v_desc,''),v_type,auth.uid()) on conflict(id) do update set code=excluded.code,name=excluded.name,description=excluded.description,updated_at=now();

 for v_variant in select value from jsonb_array_elements(p_payload->'variants') loop
 v_vid:=(v_variant->>'id')::uuid;v_sku:=trim(v_variant->>'sku');v_size:=trim(coalesce(v_variant->>'size',''));v_color:=trim(coalesce(v_variant->>'color',''));v_min:=(v_variant->>'minimum_stock')::int;
 if v_vid is null or v_sku is null or length(v_sku) not between 2 and 80 or length(v_size)>20 or length(v_color)>80 or v_min is null or v_min not between 0 and 100000 or length(coalesce(v_variant->>'description',''))>1000 then raise exception 'Revisa los datos de las variantes.';end if;
 if exists(select 1 from public.material_variants where id=v_vid and material_id<>v_id) then raise exception 'Esta variante pertenece a otro registro.';end if;

 v_width:=nullif(v_variant->>'width_cm','')::numeric;v_height:=nullif(v_variant->>'height_cm','')::numeric;
 if (v_width is not null and (v_width::text in ('NaN','Infinity','-Infinity') or v_width<=0 or v_width>1000)) or (v_height is not null and (v_height::text in ('NaN','Infinity','-Infinity') or v_height<=0 or v_height>1000)) then raise exception 'Dimensiones inválidas.';end if;
 insert into public.material_variants(id,material_id,sku,size,color,description,minimum_stock,width_cm,height_cm) values(v_vid,v_id,upper(v_sku),nullif(v_size,''),nullif(v_color,''),nullif(trim(v_variant->>'description'),''),v_min,v_width,v_height) on conflict(id) do update set sku=excluded.sku,size=excluded.size,color=excluded.color,description=excluded.description,minimum_stock=excluded.minimum_stock,width_cm=excluded.width_cm,height_cm=excluded.height_cm,updated_at=now();

 if not exists(select 1 from public.inventory_balances where material_variant_id=v_vid and location_id=v_location) then insert into public.inventory_balances(location_id,material_variant_id) values(v_location,v_vid);end if;
 end loop;return v_id;end;$$;
 create function arma_private.set_material_active(p_id uuid,p_active boolean) returns void language plpgsql security definer set search_path='' as $$begin
 if p_active is null or not public.has_commerce_permission('materials.hide') then raise exception 'No tienes permiso para ocultar o reactivar.' using errcode='42501';end if;
 update public.materials set is_active=p_active,updated_at=now() where id=p_id;if not found then raise exception 'Registro no encontrado.';end if;end;$$;
 create or replace function arma_private.attach_material_image(p_id uuid,p_path text) returns uuid language plpgsql security definer set search_path='' as $$declare v_image uuid;begin
 if not (public.has_commerce_permission('materials.edit') or (public.has_commerce_permission('materials.create') and exists(select 1 from public.materials where id=p_id and created_by=auth.uid()))) then raise exception 'No tienes permiso para agregar fotografías.' using errcode='42501';end if;
 perform 1 from public.materials where id=p_id and is_active for update;if not found then raise exception 'Registro no disponible.';end if;
 if p_path is null or p_path!~('^materials/'||p_id::text||'/[0-9a-f-]{36}\.(png|jpg|webp)$') or not exists(select 1 from storage.objects o where o.bucket_id='inventory-images' and o.name=p_path and o.owner_id=auth.uid()::text) then raise exception 'La fotografía no pertenece a esta operación.';end if;
 insert into public.material_images(material_id,storage_path,alt_text,sort_order,is_cover) select p_id,p_path,m.name,(select count(*) from public.material_images where material_id=p_id),not exists(select 1 from public.material_images where material_id=p_id) from public.materials m where m.id=p_id returning id into v_image;return v_image;end;$$;
 create function public.save_material(p_payload jsonb) returns uuid language sql set search_path='' as $$select arma_private.save_material(p_payload);$$;
 create function public.set_material_active(p_id uuid,p_active boolean) returns void language sql set search_path='' as $$select arma_private.set_material_active(p_id,p_active);$$;
 create or replace function public.attach_material_image(p_id uuid,p_path text) returns uuid language sql set search_path='' as $$select arma_private.attach_material_image(p_id,p_path);$$;
 revoke all on function arma_private.save_material(jsonb),arma_private.set_material_active(uuid,boolean),arma_private.attach_material_image(uuid,text),public.save_material(jsonb),public.set_material_active(uuid,boolean),public.attach_material_image(uuid,text) from public,anon;
 grant execute on function arma_private.save_material(jsonb),arma_private.set_material_active(uuid,boolean),arma_private.attach_material_image(uuid,text),public.save_material(jsonb),public.set_material_active(uuid,boolean),public.attach_material_image(uuid,text) to authenticated;

create function public.catalog_admin_page(p_kind text,p_page int default 1,p_search text default '',p_state text default 'active') returns jsonb language sql set search_path='' as $$select arma_private.catalog_admin_page(p_kind,p_page,p_search,p_state);$$;
revoke all on function public.catalog_admin_page(text,int,text,text),arma_private.catalog_admin_page(text,int,text,text) from public,anon;
grant execute on function public.catalog_admin_page(text,int,text,text),arma_private.catalog_admin_page(text,int,text,text) to authenticated;
alter policy products_read on public.products using (public.has_commerce_permission('products.read') or public.has_commerce_permission('products.manage'));
alter policy products_read on public.product_variants using (public.has_commerce_permission('products.read') or public.has_commerce_permission('products.manage'));
alter policy products_read on public.product_images using (public.has_commerce_permission('products.read') or public.has_commerce_permission('products.manage') or exists(select 1 from public.commerce_order_items i where i.product_id=product_images.product_id));
alter policy materials_images_upload on storage.objects with check (bucket_id='inventory-images' and (storage.foldername(name))[1]='materials' and exists(select 1 from public.materials m where m.id::text=(storage.foldername(objects.name))[2] and m.is_active and (public.has_commerce_permission('materials.edit') or (public.has_commerce_permission('materials.create') and m.created_by=auth.uid()))));
create policy products_images_upload on storage.objects for insert to authenticated with check (bucket_id='inventory-images' and (storage.foldername(name))[1]='products' and exists(select 1 from public.products m where m.id::text=(storage.foldername(objects.name))[2] and m.is_active and (public.has_commerce_permission('products.edit') or (public.has_commerce_permission('products.create') and m.created_by=auth.uid()))));
alter policy inventory_images_read on storage.objects using (bucket_id='inventory-images' and (exists(select 1 from public.product_images i where i.storage_bucket=objects.bucket_id and (i.storage_path=objects.name or i.thumbnail_path=objects.name)) or exists(select 1 from public.material_images i where i.storage_bucket=objects.bucket_id and i.storage_path=objects.name)));
