begin;
set local role anon;
do $$
declare v jsonb; v_id uuid; v_detail jsonb;
begin
  v := public.customer_catalog_page();
  assert jsonb_array_length(v->'items') <= 12, 'Page size must be bounded';
  assert not has_table_privilege(current_user,'public.products','select'), 'Guests must not read product tables directly';
  assert not has_table_privilege(current_user,'public.commerce_orders','select'), 'Guests must not read sales';
  assert not has_table_privilege(current_user,'public.profiles','select'), 'Guests must not read staff';
  assert not has_function_privilege(current_user,'public.business_dashboard(date,date)','execute'), 'Guests must not read dashboard';
  assert not arma_private.customer_catalog_image('materials/not-a-public-file.png'), 'Raw material photos must remain private';
  assert not arma_private.customer_catalog_image('products/orphan.png'), 'Orphan photos must remain private';
  assert jsonb_array_length(public.customer_catalog_page(p_search => '''; select * from profiles; --')->'items')=0, 'Search must be literal';
  assert (public.customer_catalog_page(p_page => -20)->>'page')::integer=1, 'Invalid page must clamp';
  if jsonb_array_length(v->'items') > 0 then
    v_id := (v->'items'->0->>'id')::uuid;
    v_detail := public.customer_catalog_page(p_id=>v_id)->'items'->0;
    assert not v_detail ?| array['cost','created_by','stock','physical_quantity','reserved_quantity'], 'Private fields must not be projected';
    assert not (v_detail->'variants'->0) ?| array['sku','minimum_stock','seller_price','consignment_lots','inventory_balances','unit_cost'], 'Private variant fields must not be projected';
    assert v_detail->>'name'=v->'items'->0->>'name', 'Detail must match listed product';
  end if;
end $$;
select 'guest projection and permission checks passed' as result;
rollback;
