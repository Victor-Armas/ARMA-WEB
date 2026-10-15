alter policy commerce_orders_read on public.commerce_orders to authenticated using(
(case when kind='sale' then (select public.has_commerce_permission('sales.read')) else (select public.has_commerce_permission('reservations.read')) end)
and(created_by=(select auth.uid()) or (select public.has_commerce_permission('commerce.read_all'))));
alter policy profiles_select_own on public.profiles to authenticated using(id=(select auth.uid()) and (select arma_private.actor_ready()));
alter policy profiles_update_own on public.profiles to authenticated using(id=(select auth.uid()) and (select arma_private.actor_ready())) with check(id=(select auth.uid()) and (select arma_private.actor_ready()));
create index if not exists permission_changes_actor_idx on arma_private.permission_changes(actor_id);
create index if not exists role_changes_actor_idx on arma_private.role_changes(actor_id);
create index if not exists role_changes_user_idx on arma_private.role_changes(user_id);
create index if not exists seller_deliveries_actor_idx on arma_private.seller_deliveries(created_by);
create index if not exists seller_settlements_actor_idx on arma_private.seller_settlements(created_by);
create index if not exists seller_stock_returns_actor_idx on arma_private.seller_stock_returns(created_by);
create index if not exists user_admin_audit_actor_idx on arma_private.user_admin_audit(actor_id);
create index if not exists user_admin_audit_user_idx on arma_private.user_admin_audit(user_id);
create index if not exists materials_actor_idx on public.materials(created_by);
create index if not exists products_actor_idx on public.products(created_by);
create index if not exists role_permissions_assigned_by_idx on public.role_permissions(assigned_by);
create index if not exists user_roles_assigned_by_idx on public.user_roles(assigned_by);
