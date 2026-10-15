import { supabase } from "@/lib/supabase";
import {
  reservationCalendarSchema,
  type ReservationStatus,
} from "../schemas/reservation-calendar.schema";
export interface ReservationCalendarFilters {
  from: string;
  to: string;
  search: string;
  status: ReservationStatus;
  seller: string;
}
export async function getReservationCalendar(
  filters: ReservationCalendarFilters,
  signal: AbortSignal,
) {
  const { data, error } = await supabase
    .rpc("reservation_calendar", {
      p_from: filters.from,
      p_to: filters.to,
      p_search: filters.search,
      p_status: filters.status,
      p_seller: filters.seller || null,
    })
    .abortSignal(signal);
  if (error) throw error;
  return reservationCalendarSchema.parse(data);
}
