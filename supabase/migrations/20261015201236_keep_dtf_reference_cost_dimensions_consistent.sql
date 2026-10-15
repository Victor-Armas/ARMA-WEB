create or replace function arma_private.save_material_cost(p_payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();req uuid:=(p_payload->>'request_id')::uuid;variant uuid:=(p_payload->>'variant_id')::uuid;mode text:=p_payload->>'method';cost numeric;sp numeric;sw numeric;sl numeric;dw numeric;dh numeric;waste numeric;bal public.inventory_balances;loc uuid;material_type text;apply_inventory boolean:=coalesce((p_payload->>'apply_inventory')::boolean,false);begin
 if actor is null or not public.has_commerce_permission('materials.edit') then raise exception 'No tienes permiso para editar costos.' using errcode='42501';end if;
 if req is null or variant is null then raise exception 'Falta identificador.';end if;perform pg_advisory_xact_lock(hashtextextended(req::text,0));
 if exists(select 1 from arma_private.material_cost_changes where id=req and created_by=actor and material_variant_id=variant) then return variant;end if;
 select m.material_type into material_type from public.material_variants v join public.materials m on m.id=v.material_id where v.id=variant and v.is_active and m.is_active for share of v;
 if not found then raise exception 'La variante no está activa.';end if;
 if mode='manual' then cost:=(p_payload->>'manual_cost')::numeric;if cost is null or cost::text in('NaN','Infinity','-Infinity') or cost<0 or cost>999999 or cost<>round(cost,2) then raise exception 'Costo manual inválido.';end if;
 elsif mode='area' then
  if material_type<>'dtf_transfer' then raise exception 'El cálculo por área corresponde a transferencias DTF.';end if;
  sp:=(p_payload->>'sheet_price')::numeric;sw:=(p_payload->>'sheet_width_cm')::numeric;sl:=(p_payload->>'sheet_length_cm')::numeric;dw:=(p_payload->>'design_width_cm')::numeric;dh:=(p_payload->>'design_height_cm')::numeric;waste:=(p_payload->>'waste_percent')::numeric;
  if sp is null or sw is null or sl is null or dw is null or dh is null or waste is null or exists(select 1 from unnest(array[sp,sw,sl,dw,dh,waste])v where v::text in('NaN','Infinity','-Infinity') or v<>round(v,2)) or sp<=0 or sp>999999 or sw<=0 or sw>1000 or sl<=0 or sl>10000 or dw<=0 or dh<=0 or dw>1000 or dh>1000 or waste<0 or waste>100 then raise exception 'Revisa precio, dimensiones en centímetros y merma.';end if;
  if not((dw<=sw and dh<=sl) or (dh<=sw and dw<=sl)) then raise exception 'El diseño no cabe en el formato de impresión, ni al rotarlo.';end if;
  cost:=ceil((sp/(sw*sl)*dw*dh*(1+waste/100))*100)/100;
 else raise exception 'Método de costo inválido.';end if;
 if cost>999999 then raise exception 'El costo calculado es demasiado grande.';end if;
 if apply_inventory and not public.has_commerce_permission('materials.receive') then raise exception 'Necesitas permiso para valorar existencias.' using errcode='42501';end if;
 insert into arma_private.material_cost_profiles values(variant,mode,case when mode='manual' then cost end,sp,sw,sl,dw,dh,coalesce(waste,0),cost,actor,now()) on conflict(material_variant_id) do update set method=excluded.method,manual_cost=excluded.manual_cost,sheet_price=excluded.sheet_price,sheet_width_cm=excluded.sheet_width_cm,sheet_length_cm=excluded.sheet_length_cm,design_width_cm=excluded.design_width_cm,design_height_cm=excluded.design_height_cm,waste_percent=excluded.waste_percent,unit_cost=excluded.unit_cost,updated_by=actor,updated_at=now();
 if apply_inventory then
  select id into loc from public.inventory_locations where is_default and is_active;
  insert into public.inventory_balances(location_id,material_variant_id) values(loc,variant) on conflict do nothing;
  select * into bal from public.inventory_balances where location_id=loc and material_variant_id=variant for update;
  insert into arma_private.cost_valuations values(req,bal.id,bal.average_unit_cost,cost,'Costo confirmado desde ficha de materia prima',actor,now());
  update public.inventory_balances set average_unit_cost=cost,updated_at=now() where id=bal.id;
 end if;
 if mode='area' then update public.material_variants set width_cm=dw,height_cm=dh where id=variant;end if;
 insert into arma_private.material_cost_changes values(req,variant,p_payload,actor,now());return variant;end $$;;

create function arma_private.sync_dtf_cost_dimensions() returns trigger language plpgsql security definer set search_path='' as $$
declare profile arma_private.material_cost_profiles;cost numeric;
begin
 select * into profile from arma_private.material_cost_profiles where material_variant_id=new.id and method='area' for update;
 if not found then return new;end if;
 if new.width_cm is null or new.height_cm is null or not((new.width_cm<=profile.sheet_width_cm and new.height_cm<=profile.sheet_length_cm) or (new.height_cm<=profile.sheet_width_cm and new.width_cm<=profile.sheet_length_cm)) then raise exception 'Las medidas no caben en la tarifa DTF configurada. Actualiza el formato desde Costos.';end if;
 cost:=ceil(profile.sheet_price/(profile.sheet_width_cm*profile.sheet_length_cm)*new.width_cm*new.height_cm*(1+profile.waste_percent/100)*100)/100;
 if cost>999999 then raise exception 'El costo del diseño es demasiado grande.';end if;
 update arma_private.material_cost_profiles set design_width_cm=new.width_cm,design_height_cm=new.height_cm,unit_cost=cost,updated_at=now(),updated_by=coalesce(auth.uid(),updated_by) where material_variant_id=new.id;
 return new;
end $$;
revoke all on function arma_private.sync_dtf_cost_dimensions() from public,anon,authenticated;
create trigger dtf_cost_dimensions after update of width_cm,height_cm on public.material_variants for each row when(old.width_cm is distinct from new.width_cm or old.height_cm is distinct from new.height_cm) execute function arma_private.sync_dtf_cost_dimensions();

