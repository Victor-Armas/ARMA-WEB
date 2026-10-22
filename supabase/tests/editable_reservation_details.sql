begin;
select set_config('request.jwt.claims',jsonb_build_object(
 'sub',(select ur.user_id from public.user_roles ur join public.roles r on r.id=ur.role_id where r.code='owner' limit 1),
 'role','authenticated',
 'session_id',(select s.id from auth.sessions s where s.user_id=(select ur.user_id from public.user_roles ur join public.roles r on r.id=ur.role_id where r.code='owner' limit 1) order by s.created_at desc limit 1)
)::text,true);
do $test$
declare
 actor uuid:=auth.uid();a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();req uuid:=gen_random_uuid();
 loc uuid:=gen_random_uuid();lot uuid:=gen_random_uuid();
 v public.product_variants;w public.product_variants;p public.products;
 bal public.inventory_balances;target public.inventory_balances;
 j jsonb;payload jsonb;blocked boolean;money_count bigint;movement_count bigint;seq_before bigint;
begin
 assert arma_private.actor_ready(),'An active owner session is required';
 assert public.has_commerce_permission('reservations.edit'),'Owner edit permission';
 seq_before:=pg_sequence_last_value(pg_get_serial_sequence('public.commerce_orders','order_number')::regclass);
 select pv.* into v from public.product_variants pv join public.products pr on pr.id=pv.product_id
 where pv.is_active and pr.is_active and pv.currency='MXN' and exists(select 1 from public.product_variants x where x.product_id=pv.product_id and x.id<>pv.id and x.is_active and x.currency='MXN') limit 1;
 assert v.id is not null,'Two active variants of one product are required';
 select * into w from public.product_variants where product_id=v.product_id and id<>v.id and is_active and currency='MXN' limit 1;
 select * into p from public.products where id=v.product_id;
 insert into public.commerce_orders(order_number,id,kind,status,customer_name,total,deposit,payment_method,created_by,seller_name,stock_status,stock_source,delivery_date,due_date)
 overriding system value values(900000000061,a,'reservation','active','QA edit rollback',700,100,'cash',actor,'QA','waiting','warehouse',current_date+2,current_date+1);
 insert into public.commerce_order_items(order_id,product_variant_id,inventory_balance_id,product_id,product_name,sku,size,color,quantity,catalog_price,unit_price)
 values(a,v.id,null,p.id,p.name,v.sku,v.size,v.color,2,v.sale_price,350);
 select count(*) into money_count from arma_private.commerce_payments where order_id=a;
 j:=public.reservation_edit_options(a);
 payload:=jsonb_build_object('request_id',req,'order_id',a,'version',j->>'version','variant_id',w.id,'quantity',3,'customer_name','QA edited','customer_phone','8111111111','notes','Talla corregida','stock_status','waiting','delivery_id','');
 perform public.edit_reservation(payload);
 assert (select product_variant_id=w.id and size=w.size and quantity=3 and unit_price=350 and inventory_balance_id is null from public.commerce_order_items where order_id=a),'Waiting size/quantity updated';
 assert (select total=1050 and deposit=100 and delivery_date=current_date+2 and due_date=current_date+1 and customer_name='QA edited' from public.commerce_orders where id=a),'Money and dates preserved, total recalculated';
 assert (select count(*)=money_count from arma_private.commerce_payments where order_id=a),'No payment rewritten';
 assert not exists(select 1 from public.inventory_movements where commerce_order_id=a),'Waiting edit does not move stock';
 assert (select next_state->>'total'='1050.00' and (next_state->'items'->0->>'quantity')::int=3 from arma_private.reservation_edits where id=req),'Audit contains new state';
 perform public.edit_reservation(payload);
 assert (select count(*)=1 from arma_private.reservation_edits where order_id=a),'Retry idempotent';
 blocked:=false;begin perform public.edit_reservation(payload||jsonb_build_object('quantity',4));exception when raise_exception then blocked:=true;end;assert blocked,'Request identifier cannot be reused with another payload';
 blocked:=false;begin perform public.edit_reservation(payload||jsonb_build_object('request_id',gen_random_uuid()));exception when raise_exception then blocked:=true;end;assert blocked,'Stale editor rejected';
 update public.commerce_orders set deposit=500 where id=a;
 j:=public.reservation_edit_options(a);payload:=payload||jsonb_build_object('request_id',gen_random_uuid(),'version',j->>'version','quantity',1);
 blocked:=false;begin perform public.edit_reservation(payload);exception when raise_exception then blocked:=true;end;assert blocked,'Cannot reduce total below received deposits';
 update public.commerce_orders set deposit=100 where id=a;
 insert into public.inventory_balances(product_variant_id,location_id,physical_quantity,reserved_quantity)
 select x.id,l.id,0,0 from public.product_variants x cross join public.inventory_locations l where x.id in (v.id,w.id) and l.is_default and l.is_active on conflict do nothing;
 select b.* into bal from public.inventory_balances b join public.inventory_locations l on l.id=b.location_id where b.product_variant_id=v.id and l.is_default and l.is_active;
 select b.* into target from public.inventory_balances b join public.inventory_locations l on l.id=b.location_id where b.product_variant_id=w.id and l.is_default and l.is_active;
 update public.inventory_balances set physical_quantity=reserved_quantity+10 where id in (bal.id,target.id);
 j:=public.reservation_edit_options(a);payload:=payload||jsonb_build_object('request_id',gen_random_uuid(),'version',j->>'version','variant_id',v.id,'quantity',2,'stock_status','reserved');
 perform public.edit_reservation(payload);
 assert (select reserved_quantity=bal.reserved_quantity+2 from public.inventory_balances where id=bal.id),'Waiting to reserved allocates stock';
 j:=public.reservation_edit_options(a);payload:=payload||jsonb_build_object('request_id',gen_random_uuid(),'version',j->>'version','variant_id',w.id,'quantity',4);
 perform public.edit_reservation(payload);
 assert (select reserved_quantity=bal.reserved_quantity from public.inventory_balances where id=bal.id),'Old size reservation released';
 assert (select reserved_quantity=target.reserved_quantity+4 and physical_quantity=target.reserved_quantity+10 from public.inventory_balances where id=target.id),'New size reserved, physical unchanged';
 movement_count:=(select count(*) from public.inventory_movements where commerce_order_id=a);
 perform public.edit_reservation(payload);
 assert (select count(*)=movement_count from public.inventory_movements where commerce_order_id=a),'Retry has no stock side effects';
 j:=public.reservation_edit_options(a);payload:=payload||jsonb_build_object('request_id',gen_random_uuid(),'version',j->>'version','quantity',10000);
 blocked:=false;begin perform public.edit_reservation(payload);exception when raise_exception then blocked:=true;end;assert blocked,'Insufficient inventory rejected';
 assert (select quantity=4 from public.commerce_order_items where order_id=a),'Shortage rolls back all edits';
 j:=public.reservation_edit_options(a);payload:=payload||jsonb_build_object('request_id',gen_random_uuid(),'version',j->>'version','quantity',1,'stock_status','waiting');
 perform public.edit_reservation(payload);
 assert (select reserved_quantity=target.reserved_quantity from public.inventory_balances where id=target.id),'Waiting releases old reservation';
 assert (select inventory_balance_id is null from public.commerce_order_items where order_id=a),'No fake balance on pending stock';
 -- Seller edits use their existing deliveries and preserve the agreed ARMA floor.
 insert into public.inventory_locations(id,code,name) values(loc,'qa-edit-'||loc::text,'QA seller edit rollback');
 insert into arma_private.seller_deliveries(id,seller_id,product_variant_id,location_id,quantity,unit_price,created_by) values(lot,actor,v.id,loc,5,200,actor);
 insert into public.inventory_balances(product_variant_id,location_id,physical_quantity,reserved_quantity) values(v.id,loc,5,0);
 insert into public.commerce_orders(order_number,id,kind,status,customer_name,total,created_by,seller_name,stock_status,stock_source)
 overriding system value values(900000000062,b,'reservation','active','QA seller edit',350,actor,'QA','waiting','seller');
 insert into public.commerce_order_items(order_id,product_variant_id,inventory_balance_id,product_id,product_name,sku,size,color,quantity,catalog_price,unit_price)
 values(b,v.id,null,p.id,p.name,v.sku,v.size,v.color,1,v.sale_price,350);
 j:=public.reservation_edit_options(b);payload:=jsonb_build_object('request_id',gen_random_uuid(),'order_id',b,'version',j->>'version','variant_id',v.id,'quantity',2,'customer_name','QA seller edited','customer_phone','','notes','','stock_status','reserved','delivery_id',lot);
 perform public.edit_reservation(payload);
 assert (select delivery_id=lot from arma_private.seller_order_links where order_id=b),'Seller delivery correctly linked';
 assert (select reserved_quantity=2 and physical_quantity=5 from public.inventory_balances where location_id=loc),'Seller stock reserved';
 j:=public.reservation_edit_options(b);payload:=payload||jsonb_build_object('request_id',gen_random_uuid(),'version',j->>'version','stock_status','waiting','variant_id',w.id,'delivery_id','');
 perform public.edit_reservation(payload);
 assert not exists(select 1 from arma_private.seller_order_links where order_id=b),'Waiting edit detaches old delivery';
 assert (select reserved_quantity=0 and physical_quantity=5 from public.inventory_balances where location_id=loc),'Seller stock released';
 update public.commerce_orders set status='cancelled' where id=b;
 blocked:=false;begin perform public.reservation_edit_options(b);exception when raise_exception then blocked:=true;end;assert blocked,'Closed order cannot be edited';
 assert seq_before=pg_sequence_last_value(pg_get_serial_sequence('public.commerce_orders','order_number')::regclass),'No production folios consumed';
end;$test$;
set local role anon;
do $$begin
 assert not has_function_privilege(current_user,'public.edit_reservation(jsonb)','execute'),'Anonymous writes denied';
 assert not has_function_privilege(current_user,'public.reservation_edit_options(uuid)','execute'),'Anonymous reads denied';
end;$$;
reset role;
set local role authenticated;
do $$begin
 assert not has_table_privilege(current_user,'arma_private.reservation_edits','select'),'Private audit is inaccessible directly';
 assert not has_table_privilege(current_user,'public.commerce_orders','update'),'Direct order updates remain denied';
end;$$;
reset role;
select set_config('request.jwt.claims','{}',true);
set local role authenticated;
do $$declare blocked boolean:=false;begin
 begin perform public.reservation_edit_options(gen_random_uuid());exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'A valid user/session and edit permission are required';
 blocked:=false;
 begin perform public.edit_reservation('{}'::jsonb);exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'Unauthenticated edit writes rejected';
end;$$;
reset role;
rollback;
select 'PASS reservation edits: waiting/reserved/seller stock, payments and dates, totals, shortages, stale versions, idempotence, audit and session/guest/direct-write denial. All fixtures rolled back; no folios consumed.' result;
