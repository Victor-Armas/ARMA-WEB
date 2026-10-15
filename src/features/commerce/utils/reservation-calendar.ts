import type { CalendarView } from "../schemas/reservation-calendar.schema";
// Date-only values use UTC arithmetic so daylight-saving changes never shift a cell.
export function parseCalendarDate(date: string) {
  return new Date(`${date}T12:00:00Z`);
}
export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}
export function addDays(date: string, count: number) {
  const next = parseCalendarDate(date);
  next.setUTCDate(next.getUTCDate() + count);
  return dateKey(next);
}
export function startOfWeek(date: string) {
  const day = parseCalendarDate(date).getUTCDay();
  return addDays(date, -((day + 6) % 7));
}
export function calendarRange(anchor: string, view: CalendarView) {
  const start =
    view === "week"
      ? startOfWeek(anchor)
      : startOfWeek(`${anchor.slice(0, 7)}-01`);
  return { from: start, to: addDays(start, view === "week" ? 6 : 41) };
}
export function calendarDates(from: string, to: string) {
  const days: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) days.push(date);
  return days;
}
export function moveCalendar(
  anchor: string,
  view: CalendarView,
  direction: number,
) {
  if (view === "week") return addDays(anchor, direction * 7);
  const next = parseCalendarDate(`${anchor.slice(0, 7)}-01`);
  next.setUTCMonth(next.getUTCMonth() + direction);
  return dateKey(next);
}
export function calendarHeading(anchor: string, view: CalendarView) {
  const options: Intl.DateTimeFormatOptions = {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  };
  if (view === "month")
    return new Intl.DateTimeFormat("es-MX", options).format(
      parseCalendarDate(anchor),
    );
  const start = startOfWeek(anchor);
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).formatRange(
    parseCalendarDate(start),
    parseCalendarDate(addDays(start, 6)),
  );
}
export function fullCalendarDate(date: string) {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseCalendarDate(date));
}
export function deliveryTone(date: string, today: string, pending = true) {
  if (!pending) return "closed";
  const days =
    (parseCalendarDate(date).getTime() - parseCalendarDate(today).getTime()) /
    86400000;
  return days < 0
    ? "overdue"
    : days === 0
      ? "today"
      : days <= 2
        ? "soon"
        : days <= 7
          ? "week"
          : "later";
}
export const deliveryTones = {
  overdue: {
    label: "Atrasadas",
    classes: "bg-arma-red-soft text-arma-red",
    dot: "bg-arma-red",
  },
  today: {
    label: "Hoy",
    classes: "bg-arma-primary-soft text-arma-active",
    dot: "bg-arma-active",
  },
  soon: {
    label: "1–2 días",
    classes: "bg-arma-warning-soft text-arma-warning",
    dot: "bg-arma-warning",
  },
  week: {
    label: "3–7 días",
    classes: "bg-arma-gold-soft text-arma-gold",
    dot: "bg-arma-gold",
  },
  later: {
    label: "8 días o más",
    classes: "bg-arma-info-soft text-arma-info",
    dot: "bg-arma-info",
  },
  closed: {
    label: "Entregados / cancelados",
    classes: "bg-arma-neutral-soft text-arma-neutral",
    dot: "bg-arma-neutral",
  },
};
