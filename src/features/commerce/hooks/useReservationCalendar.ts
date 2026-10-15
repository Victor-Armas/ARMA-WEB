import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import {
  getReservationCalendar,
  type ReservationCalendarFilters,
} from "../services/reservation-calendar.service";
import { todayInMonterrey } from "../utils/commerce-format";
export function useReservationCalendar(
  filters: ReservationCalendarFilters,
  enabled: boolean,
) {
  const userId = useAuthStore((state) => state.session?.user.id);
  return useQuery({
    queryKey: ["reservation-calendar", userId, filters],
    enabled: Boolean(userId) && enabled,
    queryFn: ({ signal }) => getReservationCalendar(filters, signal),
    staleTime: 15000,
    refetchInterval: 60000,
    refetchOnWindowFocus: "always",
  });
}
export function useReservationToday() {
  const [today, setToday] = useState(todayInMonterrey);
  useEffect(() => {
    const timer = window.setInterval(() => setToday(todayInMonterrey()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  return today;
}
