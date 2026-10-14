import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { getSignedProductImages, getImageRefreshAt } from '@/features/products/services/product-image-cache.service';
import { commercePermissionsSchema, ordersPageSchema, type CreateOrderInput, type ResolveReservationInput, type OrderKind, type SalesPeriod } from '../schemas/commerce.schema';

export function isRejectedOperation(error: unknown): boolean {
  const parsed = z.object({code: z.string()}).safeParse(error);
  return parsed.success && (parsed.data.code === 'P0001' || parsed.data.code === '42501' || parsed.data.code.startsWith('22') || parsed.data.code.startsWith('23'));
}

export function commerceError(error: unknown): string {
  const parsed = z.object({code: z.string(), message: z.string()}).safeParse(error);
  if (parsed.success && parsed.data.code === '42501') return 'Tu cuenta no tiene permiso para esta operación.';
  if (parsed.success && parsed.data.code === 'P0001') return parsed.data.message;
  return 'No pudimos completar la operación. Reintenta; no se duplicará el registro.';
}
export async function getCommercePermissions(signal: AbortSignal) {
  const {data, error} = await supabase.rpc('commerce_permissions').abortSignal(signal);
  if (error) throw error;
  return commercePermissionsSchema.parse(data);
}
export async function getCommerceOrders(kind: OrderKind, page: number, search: string, status: string, delivery: string, period: SalesPeriod, userId: string, signal: AbortSignal) {
  const {data, error} = await supabase.rpc('commerce_orders_page', {p_kind: kind, p_page: page, p_search: search, p_status: status, p_delivery: delivery, p_period: period}).abortSignal(signal);
  if (error) throw error;
  const response = ordersPageSchema.parse(data);
  const paths = response.items.flatMap(order => order.items.flatMap(item => item.cover_path ? [item.cover_path] : []));
  try {
    const images = await getSignedProductImages(paths, userId);
    return {...response, imageRefreshAt: getImageRefreshAt(images), items: response.items.map(order => ({...order, items: order.items.map(item => ({...item, cover_url: item.cover_path ? images.get(item.cover_path)?.url ?? null : null}))}))};
  } catch {
    // Un fallo de Storage no impide consultar los registros y sus importes.
    return {...response, imageRefreshAt: null};
  }
}
export async function createCommerceOrder(input: CreateOrderInput) {
  const {data, error} = await supabase.rpc('create_commerce_order', {p_payload: {...input, due_date: input.due_date || null, delivery_date: input.delivery_date || null, payment_method: input.kind === 'reservation' && input.deposit === 0 ? null : input.payment_method}});
  if (error) throw error;
  return z.uuid().parse(data);
}
export async function resolveReservation(input: ResolveReservationInput) {
  const {data, error} = await supabase.rpc('resolve_reservation', {p_id: input.id, p_action: input.action, p_request_id: input.requestId, p_payment_method: input.paymentMethod, p_refund_confirmed: input.refundConfirmed});
  if (error) throw error;
  return z.uuid().parse(data);
}

export async function setReservationDeliveryDate(input: {id: string; date: string | null}) {
  const {data,error} = await supabase.rpc('set_reservation_delivery_date', {p_id: input.id, p_date: input.date});
  if(error) throw error;
  return z.uuid().parse(data);
}

export async function markReservationDelivered(id: string) {
  const {data,error} = await supabase.rpc('mark_reservation_delivered', {p_id: id});
  if(error) throw error;
  return z.uuid().parse(data);
}
