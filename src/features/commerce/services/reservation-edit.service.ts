import { z } from "zod";
import { supabase } from "@/lib/supabase";
import type { OperationPayload } from "@/features/operations/schemas/operations.schema";
import { reservationEditOptionsSchema } from "../schemas/reservation-edit.schema";

export async function getReservationEditOptions(
  id: string,
  signal: AbortSignal,
) {
  const { data, error } = await supabase
    .rpc("reservation_edit_options", { p_id: id })
    .abortSignal(signal);
  if (error) throw error;
  return reservationEditOptionsSchema.parse(data);
}

export async function editReservation(payload: OperationPayload) {
  const { data, error } = await supabase.rpc("edit_reservation", {
    p_payload: payload,
  });
  if (error) throw error;
  return z.uuid().parse(data);
}
