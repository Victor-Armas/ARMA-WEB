import { z } from "zod";
export const reservationStatusSchema = z.enum([
  "",
  "pending",
  "waiting_stock",
  "active",
  "fulfilled",
  "delivered",
  "cancelled",
]);
export type ReservationStatus = z.infer<typeof reservationStatusSchema>;
export const reservationCalendarSchema = z.object({
  days: z.array(
    z.object({
      date: z.iso.date(),
      orders: z.number().int().nonnegative(),
      pieces: z.number().int().nonnegative(),
      pending_orders: z.number().int().nonnegative(),
    }),
  ),
  summary: z.object({
    waiting_orders: z.number().int().nonnegative().default(0),
    waiting_pieces: z.number().int().nonnegative().default(0),
    pending_orders: z.number().int().nonnegative(),
    pending_pieces: z.number().int().nonnegative(),
    balance: z.number().nonnegative(),
    overdue_orders: z.number().int().nonnegative(),
    unscheduled_orders: z.number().int().nonnegative(),
    unscheduled_pieces: z.number().int().nonnegative(),
  }),
});
export type ReservationCalendar = z.infer<typeof reservationCalendarSchema>;
export type CalendarView = "month" | "week";
