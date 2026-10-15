begin;
do $$
declare a uuid:=gen_random_uuid();sp uuid:=gen_random_uuid();sc uuid:=gen_random_uuid();ss uuid:=gen_random_uuid();p uuid:=gen_random_uuid();v uuid:=gen_random_uuid();loc uuid;lp uuid:=gen_random_uuid();lc uuid:=gen_random_uuid();ls uuid:=gen_random_uuid();sale_p uuid:=gen_random_uuid();sale_c uuid:=gen_random_uuid();sale_s uuid:=gen_random_uuid();item uuid;j jsonb;baseline jsonb;company jsonb;blocked boolean;begin
 insert into auth.users(id,email) values(a,a::text||'@example.invalid'),(sp,sp::text||'@example.invalid'),(sc,sc::text||'@example.invalid'),(ss,ss::text||'@example.invalid');
 update arma_private.user_security set requires_password_change=false,sessions_valid_from=null where user_id in(a,sp,sc,ss);
 insert into public.user_roles(user_id,role_id) select a,id from public.roles where code='admin' on conflict do nothing;
 insert into public.user_roles(user_id,role_id) select u.id,r.id from (values(sp),(sc),(ss))u(id) cross join public.roles r where r.code='seller' on conflict do nothing;
 insert into public.products(id,code,name,created_by) values(p,p::text,'TEST DELIVERY TERMS',a);
 insert into public.product_variants(id,product_id,sku,size,color,sale_price) values(v,p,v::text,'M','Negro',300);
 select id into loc from public.inventory_locations where is_default and is_active;
 insert into public.inventory_balances(location_id,product_variant_id,physical_quantity,average_unit_cost) values(loc,v,30,100);
 execute 'set local role authenticated';perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 baseline:=public.business_dashboard((now() at time zone 'America/Monterrey')::date,(now() at time zone 'America/Monterrey')::date)->'company';
 perform public.seller_write(jsonb_build_object('request_id',lp,'action','deliver','seller_id',sp,'variant_id',v,'quantity',3,'unit_price',200,'payment_terms','paid','method','cash','amount',1));
 perform public.seller_write(jsonb_build_object('request_id',lp,'action','deliver','seller_id',sp,'variant_id',v,'quantity',3,'unit_price',200,'payment_terms','paid','method','cash'));
 j:=public.seller_overview(sp,1);if (j->'summary'->>'due')::numeric<>0 or (j->'summary'->>'paid')::numeric<>600 or (j->'summary'->>'owed')::numeric<>600 or (j->'summary'->>'earned')::numeric<>0 or (j->>'payments_total')::int<>1 or (j->'deliveries'->0->>'initial_paid')::numeric<>600 then raise exception 'paid delivery or retry incorrect: %',j;end if;
 perform public.seller_write(jsonb_build_object('request_id',lc,'action','deliver','seller_id',sc,'variant_id',v,'quantity',3,'unit_price',200,'payment_terms','credit'));
 j:=public.seller_overview(sc,1);if (j->'summary'->>'due')::numeric<>600 or (j->'summary'->>'earned')::numeric<>0 then raise exception 'credit delivery did not create debt or created negative gain';end if;
 perform public.seller_write(jsonb_build_object('request_id',ls,'action','deliver','seller_id',ss,'variant_id',v,'quantity',3,'unit_price',200));
 j:=public.seller_overview(ss,1);if (j->'summary'->>'due')::numeric<>0 or j->'deliveries'->0->>'payment_terms'<>'consignment' then raise exception 'legacy consignment changed';end if;
 blocked:=false;begin perform public.seller_write(jsonb_build_object('request_id',gen_random_uuid(),'action','deliver','seller_id',sp,'variant_id',v,'quantity',1,'unit_price',200,'payment_terms','paid'));exception when raise_exception then blocked:=true;end;if not blocked then raise exception 'paid delivery without payment method accepted';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',sp,'role','authenticated')::text,true);
 perform public.create_commerce_order(jsonb_build_object('request_id',sale_p,'kind','sale','variant_id',v,'delivery_id',lp,'quantity',1,'unit_price',300,'payment_method','cash'));
 j:=public.seller_overview(null,1);if (j->'summary'->>'due')::numeric<>0 or (j->'summary'->>'earned')::numeric<>100 then raise exception 'paid resale charged again';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',sc,'role','authenticated')::text,true);
 perform public.create_commerce_order(jsonb_build_object('request_id',sale_c,'kind','sale','variant_id',v,'delivery_id',lc,'quantity',1,'unit_price',350,'payment_method','cash'));
 j:=public.seller_overview(null,1);if (j->'summary'->>'due')::numeric<>600 or (j->'summary'->>'earned')::numeric<>150 then raise exception 'credit resale charged again';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ss,'role','authenticated')::text,true);
 perform public.create_commerce_order(jsonb_build_object('request_id',sale_s,'kind','sale','variant_id',v,'delivery_id',ls,'quantity',1,'unit_price',300,'payment_method','cash'));
 j:=public.seller_overview(null,1);if (j->'summary'->>'due')::numeric<>200 or (j->'summary'->>'earned')::numeric<>100 then raise exception 'consignment resale debt incorrect';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 perform public.seller_write(jsonb_build_object('request_id',gen_random_uuid(),'action','payment','seller_id',sc,'amount',300,'method','transfer'));
 execute 'reset role';select id into item from public.commerce_order_items where order_id=sale_c;execute 'set local role authenticated';
 perform public.commerce_adjust('return',jsonb_build_object('request_id',gen_random_uuid(),'order_id',sale_c,'item_id',item,'quantity',1,'amount',350,'method','cash','restock',true,'reason','TEST CUSTOMER RETURN'));
 j:=public.seller_overview(sc,1);if (j->'summary'->>'due')::numeric<>300 or (j->'summary'->>'earned')::numeric<>0 then raise exception 'customer return erased purchase obligation';end if;
 perform public.seller_write(jsonb_build_object('request_id',gen_random_uuid(),'action','return','seller_id',sc,'delivery_id',lc,'quantity',1));
 j:=public.seller_overview(sc,1);if (j->'summary'->>'due')::numeric<>100 then raise exception 'warehouse return did not credit purchase';end if;
 perform public.seller_write(jsonb_build_object('request_id',gen_random_uuid(),'action','return','seller_id',sp,'delivery_id',lp,'quantity',1));
 j:=public.seller_overview(sp,1);if (j->'summary'->>'due')::numeric<>-200 then raise exception 'paid purchase return did not create credit';end if;
 perform public.seller_write(jsonb_build_object('request_id',gen_random_uuid(),'action','refund','seller_id',sp,'amount',200,'method','cash'));
 j:=public.seller_overview(sp,1);if (j->'summary'->>'due')::numeric<>0 then raise exception 'purchase credit refund incorrect';end if;
 company:=public.business_dashboard((now() at time zone 'America/Monterrey')::date,(now() at time zone 'America/Monterrey')::date)->'company';
 if (company->>'revenue')::numeric-(baseline->>'revenue')::numeric<>1000
 or (company->>'known_cost')::numeric-(baseline->>'known_cost')::numeric<>500
 or (company->>'known_margin')::numeric-(baseline->>'known_margin')::numeric<>500
 or (company->>'net_receipts')::numeric-(baseline->>'net_receipts')::numeric<>700
 then raise exception 'ARMA and reseller finances mixed: baseline % after %',baseline,company;end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',sp,'role','authenticated')::text,true);
 if (select count(*) from public.inventory_balances where product_variant_id=v)<>1 then raise exception 'Seller can read another custodian balance';end if;
 if (public.business_dashboard((now() at time zone 'America/Monterrey')::date,(now() at time zone 'America/Monterrey')::date)->'company')<>'null'::jsonb then raise exception 'Seller sees company finance';end if;
 blocked:=false;begin update public.profiles set is_active=false where id=sp;exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Seller can edit account security columns';end if;
 blocked:=false;begin perform average_unit_cost from public.inventory_balances where product_variant_id=v;exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Manufacturing cost disclosed';end if;
 execute 'reset role';if (select count(*) from arma_private.seller_settlements where delivery_id=lp)<>1 then raise exception 'initial payment duplicated';end if;
end;$$;
rollback;
