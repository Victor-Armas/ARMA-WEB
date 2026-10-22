create or replace function arma_private.edit_reservation(p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid();ord public.commerce_orders;item public.commerce_order_items;
 variant public.product_variants;lot arma_private.seller_deliveries;
 previous_edit arma_private.reservation_edits;before_state jsonb;
 req uuid;order_id uuid;variant_id uuid;delivery_id uuid;target_balance uuid;
 qty integer;mode text;customer text;phone text;v_notes text;new_total numeric;available integer;
begin
 if actor is null or not public.has_commerce_permission('reservations.edit') or not public.has_commerce_permission('reservations.read') then
  raise exception 'No tienes permiso para editar apartados.' using errcode='42501';
 end if;
 req:=(p_payload->>'request_id')::uuid;order_id:=(p_payload->>'order_id')::uuid;
 if req is null or order_id is null then raise exception 'Falta el identificador de la operación.';end if;
 perform pg_advisory_xact_lock(hashtextextended(req::text,0));
 -- Match seller, order, balance lock order used by existing consignment operations.
 perform pg_advisory_xact_lock(hashtextextended('seller:'||o.created_by::text,0))
 from public.commerce_orders o where o.id=order_id and o.stock_source='seller';
 select * into ord from public.commerce_orders o where o.id=order_id and o.kind='reservation' for update;
 if not found or (ord.created_by<>actor and not public.has_commerce_permission('commerce.manage_all')) then
  raise exception 'Apartado no disponible.' using errcode='42501';
 end if;
 select * into previous_edit from arma_private.reservation_edits where id=req;
 if found then
  if previous_edit.created_by<>actor or previous_edit.order_id<>ord.id or previous_edit.payload<>p_payload then
   raise exception 'La operación ya fue utilizada con otros datos.';
  end if;
  return ord.id;
 end if;
 if ord.status<>'active' or ord.delivered_at is not null then raise exception 'Solo puedes editar apartados activos sin entregar.';end if;
 if (select count(*) from public.commerce_order_items i where i.order_id=ord.id)<>1 then raise exception 'Este apartado requiere revisión de sus partidas.';end if;
 select * into item from public.commerce_order_items i where i.order_id=ord.id for update;
 before_state:=arma_private.reservation_edit_snapshot(ord.id);
 if p_payload->>'version' is distinct from md5(before_state::text) then
  raise exception 'El apartado cambió desde que abriste la edición. Cierra y vuelve a editar para cargar los datos actuales.';
 end if;
 qty:=(p_payload->>'quantity')::integer;variant_id:=(p_payload->>'variant_id')::uuid;
 mode:=p_payload->>'stock_status';delivery_id:=nullif(p_payload->>'delivery_id','')::uuid;
 customer:=trim(p_payload->>'customer_name');phone:=trim(p_payload->>'customer_phone');v_notes:=trim(p_payload->>'notes');
 if qty is null or qty<1 or qty>10000 or mode is null or mode not in ('waiting','reserved') or customer is null or length(customer) not between 1 and 120 or phone is null or length(phone)>30 or v_notes is null or length(v_notes)>1000 then
  raise exception 'Revisa la cantidad y los datos del cliente.';
 end if;
 new_total:=qty*item.unit_price;
 if new_total<ord.deposit then raise exception 'El nuevo total no puede ser menor que los abonos recibidos. Primero revisa el reembolso correspondiente.';end if;
 select v.* into variant from public.product_variants v join public.products p on p.id=v.product_id
 where v.id=variant_id and v.product_id=item.product_id and v.is_active and p.is_active and v.currency='MXN' for share of v,p;
 if not found then raise exception 'Selecciona una talla y color activos del mismo producto.';end if;
 if ord.stock_source='warehouse' and not public.has_commerce_permission('inventory.sell_workshop') then
  raise exception 'No tienes acceso al inventario del taller.' using errcode='42501';
 end if;
 if mode='reserved' then
  if ord.stock_source='seller' then
   select * into lot from arma_private.seller_deliveries d where d.id=delivery_id and d.seller_id=ord.created_by and d.product_variant_id=variant.id;
   if not found then raise exception 'Selecciona una entrega del vendedor para esta talla y color.';end if;
   if item.unit_price<lot.unit_price then raise exception 'El precio al cliente es menor que el importe para ARMA de esta entrega.';end if;
  elsif delivery_id is not null then raise exception 'Las existencias del taller no usan una entrega de vendedor.';
  end if;
  select b.id into target_balance from public.inventory_balances b join public.inventory_locations l on l.id=b.location_id
  where b.product_variant_id=variant.id and l.is_active and ((ord.stock_source='warehouse' and l.is_default) or (ord.stock_source='seller' and l.id=lot.location_id));
  if target_balance is null then raise exception 'No hay suficientes existencias de esta variante. Puedes guardar el apartado como pendiente de existencia.';end if;
 end if;
 -- Lock both balances in deterministic order before testing availability.
 perform b.id from public.inventory_balances b where b.id in (item.inventory_balance_id,target_balance) order by b.id for update;
 if mode='reserved' then
  select b.available_quantity+case when b.id=item.inventory_balance_id then item.quantity else 0 end into available
  from public.inventory_balances b where b.id=target_balance;
  if available<qty then raise exception 'No hay suficientes existencias de esta variante. Puedes guardar el apartado como pendiente de existencia.';end if;
 end if;
 if item.inventory_balance_id is not null and (item.inventory_balance_id is distinct from target_balance or item.quantity<>qty) then
  update public.inventory_balances set reserved_quantity=reserved_quantity-item.quantity,updated_at=now() where id=item.inventory_balance_id;
  insert into public.inventory_movements(inventory_balance_id,movement_type,physical_delta,reserved_delta,reason,created_by,commerce_order_id)
  values(item.inventory_balance_id,'reservation_release',0,-item.quantity,'Edición de apartado · '||req::text,actor,ord.id);
 end if;
 if target_balance is not null and (item.inventory_balance_id is distinct from target_balance or item.quantity<>qty) then
  update public.inventory_balances set reserved_quantity=reserved_quantity+qty,updated_at=now() where id=target_balance;
  insert into public.inventory_movements(inventory_balance_id,movement_type,physical_delta,reserved_delta,reason,created_by,commerce_order_id)
  values(target_balance,'reservation',0,qty,'Edición de apartado · '||req::text,actor,ord.id);
 end if;
 -- The stock guards require waiting state before clearing a balance reference.
 if mode='waiting' then update public.commerce_orders set stock_status='waiting',stock_assigned_at=null where id=ord.id;end if;
 update public.commerce_order_items set product_variant_id=variant.id,sku=variant.sku,size=variant.size,color=variant.color,
  quantity=qty,inventory_balance_id=target_balance,
  unit_cost=(select average_unit_cost from public.inventory_balances where id=target_balance)
 where id=item.id;
 if mode='waiting' then delete from arma_private.seller_order_links l where l.order_id=ord.id;
 elsif ord.stock_source='seller' then
  insert into arma_private.seller_order_links(order_id,delivery_id) values(ord.id,lot.id)
  on conflict on constraint seller_order_links_pkey do update set delivery_id=excluded.delivery_id;
 end if;
 update public.commerce_orders set customer_name=customer,customer_phone=phone,notes=v_notes,total=new_total,
  stock_status=mode,stock_assigned_at=case when mode='waiting' then null when ord.stock_status='reserved' and item.inventory_balance_id=target_balance then ord.stock_assigned_at else now() end
 where id=ord.id;
 insert into arma_private.reservation_edits(id,order_id,payload,previous_state,next_state,created_by)
 values(req,ord.id,p_payload,before_state,arma_private.reservation_edit_snapshot(ord.id),actor);
 return ord.id;
end;$$;
