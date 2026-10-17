import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { reservationStockOptionsSchema } from "../schemas/reservation-stock.schema";
export async function getReservationStockOptions(
  id: string,
  signal: AbortSignal,
) {
  const { data, error } = await supabase
    .rpc("reservation_stock_options", { p_id: id })
    .abortSignal(signal);
  if (error) throw error;
  return reservationStockOptionsSchema.parse(data);
}
export async function assignReservationStock(input: {
  id: string;
  deliveryId: string | null;
}) {
  const { data, error } = await supabase.rpc("assign_reservation_stock", {
    p_id: input.id,
    p_delivery_id: input.deliveryId,
  });
  if (error) throw error;
  return z.uuid().parse(data);
}
