create or replace function arma_private.seller_write(p_payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();req uuid;action text;s uuid;qty int;price numeric;amt numeric;d arma_private.seller_deliveries;src public.inventory_balances;dst public.inventory_balances;loc uuid;j jsonb;begin
 if not public.has_commerce_permission('consignments.manage') then raise exception 'No tienes permiso para gestionar vendedores.' using errcode='42501';end if;
 req:=(p_payload->>'request_id')::uuid;action:=p_payload->>'action';s:=(p_payload->>'seller_id')::uuid;
 if req is null or s is null or action is null or action not in('deliver','return','payment','refund') then raise exception 'Solicitud inválida.';end if;
 perform pg_advisory_xact_lock(hashtextextended('seller:'||s::text,0));
 if exists(select 1 from arma_private.seller_deliveries where id=req and created_by=actor and seller_id=s) or exists(select 1 from arma_private.seller_settlements where id=req and created_by=actor and seller_id=s) or exists(select 1 from arma_private.seller_stock_returns r join arma_private.seller_deliveries delivery on delivery.id=r.delivery_id where r.id=req and r.created_by=actor and delivery.seller_id=s) then return req;end if;
 if not exists(select 1 from public.profiles where id=s) then raise exception 'Cuenta no encontrada.';end if;
 if action='deliver' then
  qty:=(p_payload->>'quantity')::int;price:=(p_payload->>'unit_price')::numeric;
  if qty is null or qty not between 1 and 10000 or price is null or price::text in('NaN','Infinity','-Infinity') or price<=0 or price>999999 or price<>round(price,2) or length(coalesce(p_payload->>'notes',''))>500 then raise exception 'Revisa cantidad, precio y notas.';end if;
  if not exists(select 1 from public.profiles where id=s and is_active) then raise exception 'El vendedor está deshabilitado.';end if;
  perform 1 from public.product_variants v join public.products p on p.id=v.product_id where v.id=(p_payload->>'variant_id')::uuid and v.is_active and p.is_active and v.currency='MXN' and upper(trim(v.size)) in('S','M','L') for share of v,p;
  if not found then raise exception 'Producto no disponible.';end if;
  select b.* into src from public.inventory_balances b join public.inventory_locations l on l.id=b.location_id and l.is_default and l.is_active where b.product_variant_id=(p_payload->>'variant_id')::uuid for update of b;
  if not found or src.available_quantity<qty then raise exception 'No hay suficientes piezas disponibles en el taller.';end if;
  loc:=gen_random_uuid();insert into public.inventory_locations(id,code,name) values(loc,'SELLER-'||req::text,'Entrega a vendedor');
  insert into arma_private.seller_deliveries values(req,s,src.product_variant_id,loc,qty,price,coalesce(p_payload->>'notes',''),actor,now());
  insert into public.inventory_balances(location_id,product_variant_id,physical_quantity,average_unit_cost) values(loc,src.product_variant_id,qty,src.average_unit_cost) returning * into dst;
  update public.inventory_balances set physical_quantity=physical_quantity-qty,updated_at=now() where id=src.id;
  insert into public.inventory_movements(inventory_balance_id,movement_type,physical_delta,unit_cost,reason,created_by) values(src.id,'adjustment',-qty,src.average_unit_cost,'Entrega a vendedor · '||req::text,actor),(dst.id,'entry',qty,src.average_unit_cost,'Recepción de entrega · '||req::text,actor);
 elsif action='return' then
  select * into d from arma_private.seller_deliveries where id=(p_payload->>'delivery_id')::uuid and seller_id=s;
  if not found then raise exception 'Entrega no encontrada.';end if;
  qty:=(p_payload->>'quantity')::int;if qty is null or qty<1 or qty>10000 then raise exception 'Cantidad inválida.';end if;
  select b.* into dst from public.inventory_balances b join public.inventory_locations l on l.id=b.location_id and l.is_default and l.is_active where b.product_variant_id=d.product_variant_id for update of b;
  select * into src from public.inventory_balances where location_id=d.location_id for update;
  if src.available_quantity<qty then raise exception 'No puedes devolver piezas vendidas o apartadas.';end if;
  update public.inventory_balances set average_unit_cost=case when dst.physical_quantity=0 then src.average_unit_cost when dst.average_unit_cost is null or src.average_unit_cost is null then null else round((dst.physical_quantity*dst.average_unit_cost+qty*src.average_unit_cost)/(dst.physical_quantity+qty),4) end,physical_quantity=physical_quantity+qty,updated_at=now() where id=dst.id;
  update public.inventory_balances set physical_quantity=physical_quantity-qty,updated_at=now() where id=src.id;
  insert into arma_private.seller_stock_returns values(req,d.id,qty,actor,now());
  insert into public.inventory_movements(inventory_balance_id,movement_type,physical_delta,unit_cost,reason,created_by) values(src.id,'adjustment',-qty,src.average_unit_cost,'Regreso al taller · '||req::text,actor),(dst.id,'entry',qty,src.average_unit_cost,'Regreso de vendedor · '||req::text,actor);
 else
  amt:=(p_payload->>'amount')::numeric;j:=arma_private.seller_totals(s);
  if amt is null or amt::text in('NaN','Infinity','-Infinity') or amt<=0 or amt>99999999 or amt<>round(amt,2) or p_payload->>'method' is null or p_payload->>'method' not in('cash','transfer','card') or length(coalesce(p_payload->>'reference',''))>200 then raise exception 'Revisa el importe y el medio de pago.';end if;
  if (action='payment' and amt>greatest(0,(j->>'due')::numeric)) or (action='refund' and amt>greatest(0,-(j->>'due')::numeric)) then raise exception 'El importe supera el saldo disponible.';end if;
  insert into arma_private.seller_settlements values(req,s,amt,action,p_payload->>'method',coalesce(p_payload->>'reference',''),actor,now());
 end if;
 return req;
end;$$;
