CREATE OR REPLACE FUNCTION arma_private.resolve_reservation(p_id uuid, p_action text, p_request_id uuid, p_payment_method text, p_refund_confirmed boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_actor uuid:=auth.uid(); v_order public.commerce_orders; v_item public.commerce_order_items; v_balance public.inventory_balances; v_seller text;v_delivery uuid;
begin
 if v_actor is null or not public.has_commerce_permission(case when p_action='complete' then 'sales.complete' else 'reservations.cancel' end) then raise exception 'Tu cuenta no tiene permiso para administrar apartados.' using errcode='42501'; end if;
 if p_action is null or p_action not in ('complete','cancel') then raise exception 'Acción inválida.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('seller:'||d.seller_id::text,0)) from arma_private.seller_deliveries d join arma_private.seller_order_links link on link.delivery_id=d.id where link.order_id=p_id;
 select * into v_order from public.commerce_orders where id=p_id and kind='reservation' for update;
 if not found or (v_order.created_by<>v_actor and not public.has_commerce_permission('commerce.manage_all')) then raise exception 'Apartado no encontrado.'; end if;
 select delivery_id into v_delivery from arma_private.seller_order_links where order_id=p_id;
 if v_order.status='fulfilled' and p_action='complete' then return v_order.sale_id; end if;
 if v_order.status='cancelled' and p_action='cancel' then return v_order.id; end if;
 if v_order.status<>'active' then raise exception 'Este apartado ya fue cerrado. Actualiza el listado.'; end if;
 if p_action='complete' and (p_request_id is null or p_payment_method is null or p_payment_method not in ('cash','transfer','card')) then raise exception 'Selecciona la forma de pago del saldo.'; end if;
 if p_action='cancel' and v_order.deposit>0 and not coalesce(p_refund_confirmed,false) then raise exception 'Confirma la devolución del anticipo antes de cancelar.'; end if;
 if p_action='complete' then
  select full_name into v_seller from public.profiles where id=v_actor;
  insert into public.commerce_orders(id,kind,status,customer_name,customer_phone,notes,total,deposit,payment_method,created_by,seller_name,source_reservation_id,applied_deposit)
  values(p_request_id,'sale','completed',v_order.customer_name,v_order.customer_phone,v_order.notes,v_order.total,0,p_payment_method,case when v_delivery is not null then v_order.created_by else v_actor end,case when v_delivery is not null then v_order.seller_name else coalesce(v_seller,'Personal ARMA') end,p_id,v_order.deposit);
 if v_delivery is not null then insert into arma_private.seller_order_links values(p_request_id,v_delivery);end if;
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
$function$;
