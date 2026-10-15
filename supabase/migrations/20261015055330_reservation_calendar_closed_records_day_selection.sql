CREATE OR REPLACE FUNCTION public.commerce_orders_page(p_kind text, p_page integer DEFAULT 1, p_search text DEFAULT ''::text, p_status text DEFAULT ''::text, p_delivery text DEFAULT ''::text, p_period text DEFAULT 'all'::text, p_seller uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare v_today date:=(now() at time zone 'America/Monterrey')::date;v_delivery date;v_result jsonb;v_digits text;
begin
 if not public.has_commerce_permission(case when p_kind='sale' then 'sales.read' else 'reservations.read' end) then raise exception 'Tu cuenta no tiene permiso para consultar ventas y apartados.' using errcode='42501'; end if;
 if p_kind is null or p_kind not in ('sale','reservation') or p_page is null or p_page not between 1 and 1000000 or p_search is null or length(p_search)>120 or p_status is null or p_status not in ('','pending','active','cancelled','fulfilled','completed','delivered') or p_delivery is null or p_period is null or p_period not in ('all','today','week','month') then raise exception 'Filtro inválido.'; end if;
 if p_seller is not null and not public.has_commerce_permission('commerce.read_all') then raise exception 'No puedes filtrar registros de otro vendedor.' using errcode='42501'; end if;
 if p_delivery not in ('','overdue','unscheduled') then v_delivery:=p_delivery::date; end if;
 v_digits:=regexp_replace(p_search,'[^0-9]','','g');
 with base as materialized (
 select o.* from public.commerce_orders o where o.kind=p_kind and (p_seller is null or o.created_by=p_seller) and (p_status='' or o.status=p_status or (p_status='pending' and o.status in ('active','fulfilled') and o.delivered_at is null) or (p_status='delivered' and o.delivered_at is not null))
 and (p_kind='reservation' or p_period='all' or (p_period='today' and o.created_at>=(v_today::timestamp at time zone 'America/Monterrey'))
 or (p_period='week' and o.created_at>=(date_trunc('week',v_today::timestamp) at time zone 'America/Monterrey'))
 or (p_period='month' and o.created_at>=now()-interval '30 days'))
 and (trim(p_search)='' or strpos(lower(o.customer_name),lower(trim(p_search)))>0 or strpos(lpad(o.order_number::text,4,'0'),trim(p_search))>0
 or (length(v_digits)>=3 and p_search!~'[[:alpha:]]' and (strpos(regexp_replace(o.customer_phone,'[^0-9]','','g'),v_digits)>0 or (length(v_digits)>=10 and right(regexp_replace(o.customer_phone,'[^0-9]','','g'),10)=right(v_digits,10))))
 or exists(select 1 from public.commerce_order_items i where i.order_id=o.id and strpos(lower(i.product_name||' '||i.sku),lower(trim(p_search)))>0))
 ), matched as materialized (
 select * from base where p_delivery='' or delivery_date=v_delivery or (status in ('active','fulfilled') and delivered_at is null and ((p_delivery='overdue' and delivery_date<v_today) or (p_delivery='unscheduled' and delivery_date is null)))
 ), stats as(select count(*) total,greatest(1,least(p_page,ceil(count(*)/12.0)::integer)) page from matched),
 selected as(select * from matched order by case when p_kind='reservation' then delivery_date end asc nulls last,created_at desc,id desc limit 12 offset(select (page-1)*12 from stats)),
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
 ) order by case when p_kind='reservation' then o.delivery_date end asc nulls last,o.created_at desc,o.id desc) from selected o),'[]'::jsonb),
 'delivery_summary',jsonb_build_object('scheduled',coalesce((select jsonb_agg(jsonb_build_object('date',delivery_date,'orders',orders,'pieces',pieces) order by delivery_date) from schedule),'[]'::jsonb),
 'overdue_orders',(select count(*) from active where delivery_date<v_today),'overdue_pieces',coalesce((select sum(pieces) from active where delivery_date<v_today),0),
 'unscheduled_orders',(select count(*) from active where delivery_date is null),'unscheduled_pieces',coalesce((select sum(pieces) from active where delivery_date is null),0)),
 'sales_summary',(select to_jsonb(t)||jsonb_build_object('payments',coalesce((select jsonb_agg(jsonb_build_object('method',method,'orders',orders,'amount',amount) order by amount desc) from payment_totals),'[]'::jsonb)) from sale_totals t)
 ) into v_result from stats s;
 return v_result;
end;
$function$
;
