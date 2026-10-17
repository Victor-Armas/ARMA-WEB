begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select ur.user_id from public.user_roles ur join public.roles r on r.id=ur.role_id where r.code='owner' limit 1),'role','authenticated','session_id',(select s.id from auth.sessions s where s.user_id=(select ur.user_id from public.user_roles ur join public.roles r on r.id=ur.role_id where r.code='owner' limit 1) order by s.created_at desc limit 1))::text,true);
do $test$
declare actor uuid:=auth.uid();v public.product_variants;p public.products;bal public.inventory_balances;warehouse uuid;loc uuid:=gen_random_uuid();lot uuid:=gen_random_uuid();a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();d uuid:=gen_random_uuid();sale uuid:=gen_random_uuid();normal_order uuid:=gen_random_uuid();blocked boolean;before_reserved integer;before_physical integer;before_money numeric;seq_before bigint;code text;payload jsonb;j jsonb;day date:=(now() at time zone 'America/Monterrey')::date;
begin
 assert arma_private.actor_ready(),'An active owner session is required';
 seq_before:=pg_sequence_last_value(pg_get_serial_sequence('public.commerce_orders','order_number')::regclass);
 select pv.* into v from public.product_variants pv join public.products pr on pr.id=pv.product_id where pv.is_active and pr.is_active and upper(pv.size) in ('S','M','L') and pv.currency='MXN' limit 1;
 assert v.id is not null,'An existing active variant is required';select * into p from public.products where id=v.product_id;
 select id into warehouse from public.inventory_locations where is_default and is_active;
 insert into public.inventory_balances(product_variant_id,location_id,physical_quantity,reserved_quantity) values(v.id,warehouse,0,0) on conflict do nothing;
 select * into bal from public.inventory_balances where product_variant_id=v.id and location_id=warehouse;
 update public.inventory_balances set physical_quantity=reserved_quantity where id=bal.id;
 select reserved_quantity,physical_quantity into before_reserved,before_physical from public.inventory_balances where id=bal.id;
 before_money:=(arma_private.company_finances(day::timestamp at time zone 'America/Monterrey',(day+1)::timestamp at time zone 'America/Monterrey')->>'received')::numeric;
 -- Exercise the installed creation body with only identity-number generation replaced.
 -- The production function is never replaced; no business sequence is advanced.
 payload:=jsonb_build_object('request_id',a,'kind','reservation','variant_id',v.id,'quantity',2,'unit_price',300,'deposit',50,'customer_name','QA rollback waiting stock','customer_phone','8112345678','payment_method','cash','stock_mode','waiting','stock_source','warehouse','delivery_date',day+2);
 select prosrc into code from pg_proc where oid='arma_private.create_commerce_order(jsonb)'::regprocedure;
 code:=regexp_replace(code,'^\s*declare','declare p_payload jsonb := '||quote_literal(payload::text)||'::jsonb;');
 code:=replace(code,'insert into public.commerce_orders(id,','insert into public.commerce_orders(order_number,id,');
 code:=replace(code,'values(v_id,''reservation'',''active''','overriding system value values(900000000021,v_id,''reservation'',''active''');
 code:=replace(code,'values(v_id,v_kind,case','overriding system value values(900000000022,v_id,v_kind,case');
 code:=replace(replace(code,'return v_id;','return;'),'return v_existing.id;','return;');
 execute 'do $creation$ '||code||' $creation$';
 assert (select stock_status='waiting' and stock_source='warehouse' and deposit=50 from public.commerce_orders where id=a),'Waiting request created';
 assert (select inventory_balance_id is null from public.commerce_order_items where order_id=a),'No fake balance assigned';
 assert not exists(select 1 from public.inventory_movements where commerce_order_id=a),'No inventory movement on creation';
 assert (select physical_quantity=before_physical and reserved_quantity=before_reserved from public.inventory_balances where id=bal.id),'Creation leaves stock unchanged';
 assert public.create_commerce_order(payload)=a,'Creation retry is idempotent';
 blocked:=false;begin perform public.resolve_reservation(a,'complete',gen_random_uuid(),'cash',false);exception when raise_exception then blocked:=true;end;assert blocked,'Cannot complete before allocation';
 blocked:=false;begin perform public.assign_reservation_stock(a,null);exception when raise_exception then blocked:=true;end;assert blocked,'Insufficient stock allocation rejected';
 perform public.commerce_adjust('payment',jsonb_build_object('request_id',gen_random_uuid(),'order_id',a,'amount',50,'method','transfer'));
 assert (select deposit=100 from public.commerce_orders where id=a),'Additional deposits accepted while waiting';
 -- Explicit identity fixture for a seller-owned receipt: no consignment or debt yet.
 insert into public.commerce_orders(order_number,id,kind,status,customer_name,total,deposit,payment_method,created_by,seller_name,stock_status,stock_source,delivery_date)
 overriding system value values(900000000023,b,'reservation','active','QA seller waiting',600,50,'cash',actor,'QA seller','waiting','seller',day+2);
 insert into public.commerce_order_items(order_id,product_variant_id,inventory_balance_id,product_id,product_name,sku,size,color,quantity,catalog_price,unit_price)
 values(b,v.id,null,p.id,p.name,v.sku,v.size,v.color,2,v.sale_price,300);
 assert not exists(select 1 from arma_private.seller_order_links where order_id=b),'No seller agreement invented for pending request';
 assert (arma_private.company_finances(day::timestamp at time zone 'America/Monterrey',(day+1)::timestamp at time zone 'America/Monterrey')->>'received')::numeric=before_money+100,'Seller-held deposit excluded from ARMA receipts';
 j:=public.reservation_calendar(day,day+6,'QA','waiting_stock',null);
 assert (j->'summary'->>'waiting_orders')::int>=2,'Waiting filter and calendar count';
 assert (public.commerce_orders_page('reservation',1,'QA','waiting_stock')->>'total')::int>=2,'Waiting list includes requests';
 perform public.resolve_reservation(a,'cancel',gen_random_uuid(),'cash',true);
 assert (select coalesce(sum(amount),0)=0 from arma_private.commerce_payments where order_id=a),'Cancellation refunds deposits by original methods';
 assert not exists(select 1 from public.inventory_movements where commerce_order_id=a),'Waiting cancellation creates no stock';
 perform public.resolve_reservation(a,'cancel',gen_random_uuid(),'cash',true);
 assert (select count(*)=2 from arma_private.commerce_payments where order_id=a and kind='cancellation'),'Retry creates no duplicate refunds';
 -- Allocating seller stock must use an existing delivery, not the warehouse.
 insert into public.inventory_locations(id,code,name) values(loc,'qa-'||loc::text,'QA rollback seller delivery');
 insert into arma_private.seller_deliveries(id,seller_id,product_variant_id,location_id,quantity,unit_price,created_by) values(lot,actor,v.id,loc,5,200,actor);
 insert into public.inventory_balances(product_variant_id,location_id,physical_quantity,reserved_quantity) values(v.id,loc,5,0);
 blocked:=false;begin perform public.assign_reservation_stock(b,gen_random_uuid());exception when insufficient_privilege then blocked:=true;end;assert blocked,'Wrong seller delivery rejected';
 assert (public.reservation_stock_options(b)->>'available')::int=5,'Seller-specific availability';
 perform public.assign_reservation_stock(b,lot);perform public.assign_reservation_stock(b,lot);
 assert (select stock_status='reserved' and stock_source='seller' and deposit=50 from public.commerce_orders where id=b),'Assignment keeps customer money and switches state';
 assert (select physical_quantity=5 and reserved_quantity=2 from public.inventory_balances where location_id=loc and product_variant_id=v.id),'Assignment reserves once without reducing physical stock';
 assert (select count(*)=1 from public.inventory_movements where commerce_order_id=b),'Repeated assignment has only one movement';
 assert (select delivery_id=lot from arma_private.seller_order_links where order_id=b),'Seller price agreement linked on assignment';
 perform public.resolve_reservation(b,'cancel',gen_random_uuid(),'cash',true);
 assert (select physical_quantity=5 and reserved_quantity=0 from public.inventory_balances where location_id=loc and product_variant_id=v.id),'Allocated cancellation releases only real reservation';
 -- Validate warehouse assignment and rejection of a below-agreement seller price.
 insert into public.commerce_orders(order_number,id,kind,status,customer_name,total,created_by,seller_name,stock_status,stock_source)
 overriding system value values(900000000024,c,'reservation','active','QA warehouse allocation',600,actor,'QA','waiting','warehouse'),(900000000025,d,'reservation','active','QA seller price floor',100,actor,'QA','waiting','seller');
 insert into public.commerce_order_items(order_id,product_variant_id,inventory_balance_id,product_id,product_name,sku,size,color,quantity,catalog_price,unit_price)
 values(c,v.id,null,p.id,p.name,v.sku,v.size,v.color,2,v.sale_price,300),(d,v.id,null,p.id,p.name,v.sku,v.size,v.color,1,v.sale_price,100);
 update public.inventory_balances set physical_quantity=reserved_quantity+5 where id=bal.id;
 perform public.assign_reservation_stock(c,null);
 assert (select physical_quantity=before_reserved+5 and reserved_quantity=before_reserved+2 from public.inventory_balances where id=bal.id),'Warehouse reserves real stock only';
 blocked:=false;begin perform public.assign_reservation_stock(d,lot);exception when raise_exception then blocked:=true;end;assert blocked,'Seller price floor preserved';
 -- Regression: completing an allocated reservation still makes a correctly sourced sale.
 select prosrc into code from pg_proc where oid='arma_private.resolve_reservation(uuid,text,uuid,text,boolean)'::regprocedure;
 code:=regexp_replace(code,'^\s*declare','declare p_id uuid := '||quote_literal(c::text)||'::uuid; p_action text := ''complete''; p_request_id uuid := '||quote_literal(sale::text)||'::uuid; p_payment_method text := ''card''; p_refund_confirmed boolean := false;');
 code:=replace(code,'insert into public.commerce_orders(id,','insert into public.commerce_orders(order_number,id,');
 code:=replace(code,'values(p_request_id,''sale''','overriding system value values(900000000026,p_request_id,''sale''');
 code:=replace(replace(code,'return v_order.sale_id;','return;'),'return v_order.id;','return;');
 code:=replace(code,'return case when p_action=''complete'' then p_request_id else p_id end;','return;');
 execute 'do $completion$ '||code||' $completion$';
 assert (select status='fulfilled' and sale_id=sale from public.commerce_orders where id=c),'Allocated reservation completes normally';
 assert (select stock_source='warehouse' and source_reservation_id=c and total=600 from public.commerce_orders where id=sale),'Completed sale preserves source and amount';
 assert (select physical_quantity=before_reserved+3 and reserved_quantity=before_reserved from public.inventory_balances where id=bal.id),'Completion decrements real stock exactly once';
 payload:=jsonb_build_object('request_id',normal_order,'kind','reservation','variant_id',v.id,'quantity',1,'unit_price',300,'deposit',0,'customer_name','QA normal reservation','stock_mode','reserved');
 select prosrc into code from pg_proc where oid='arma_private.create_commerce_order(jsonb)'::regprocedure;
 code:=regexp_replace(code,'^\s*declare','declare p_payload jsonb := '||quote_literal(payload::text)||'::jsonb;');
 code:=replace(code,'insert into public.commerce_orders(id,','insert into public.commerce_orders(order_number,id,');
 code:=replace(code,'values(v_id,''reservation'',''active''','overriding system value values(900000000027,v_id,''reservation'',''active''');
 code:=replace(code,'values(v_id,v_kind,case','overriding system value values(900000000028,v_id,v_kind,case');
 code:=replace(replace(code,'return v_id;','return;'),'return v_existing.id;','return;');
 execute 'do $normal$ '||code||' $normal$';
 assert (select stock_status='reserved' and stock_source='warehouse' from public.commerce_orders where id=normal_order),'Normal reservations still reserve existing stock';
 assert (select reserved_quantity=before_reserved+1 from public.inventory_balances where id=bal.id),'Normal reservation stock movement unchanged';
 assert seq_before=pg_sequence_last_value(pg_get_serial_sequence('public.commerce_orders','order_number')::regclass),'No folios consumed';
end $test$;
-- A real seller role cannot request warehouse stock, even by changing the payload.
delete from public.user_roles where user_id=auth.uid();
insert into public.user_roles(user_id,role_id) select auth.uid(),id from public.roles where code='seller';
insert into public.role_permissions(role_id,permission_id) select r.id,p.id from public.roles r cross join public.permissions p where r.code='seller' and p.key in ('products.read','reservations.create','reservations.read') on conflict do nothing;
set local role authenticated;
do $$declare v_id uuid;blocked boolean:=false;begin
 select id into v_id from public.product_variants where is_active and upper(size) in ('S','M','L') limit 1;
 begin perform public.create_commerce_order(jsonb_build_object('request_id',gen_random_uuid(),'kind','reservation','variant_id',v_id,'quantity',1,'unit_price',300,'deposit',0,'customer_name','QA rejected','stock_mode','waiting','stock_source','warehouse'));exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'Seller cannot request warehouse source';
 assert not has_table_privilege(current_user,'public.commerce_orders','insert'),'Direct order writes remain denied';
end $$;
reset role;
set local role anon;
do $$begin assert not has_function_privilege(current_user,'public.assign_reservation_stock(uuid,uuid)','execute'),'Guest stock writes denied';assert not has_function_privilege(current_user,'public.reservation_stock_options(uuid)','execute'),'Guest customer reads denied';end $$;
reset role;
rollback;
select 'PASS waiting creation body, unchanged inventory, idempotence, receipts ownership, dates/filter, deposits/refunds, assignment/shortages, seller lots/price floor, role/guest denial; all fixtures rolled back and no folios consumed' result;
