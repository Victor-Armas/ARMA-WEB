import { ChevronLeft, ChevronRight } from "lucide-react";
import type {
  CalendarView,
  ReservationCalendar as CalendarData,
} from "../schemas/reservation-calendar.schema";
import {
  calendarDates,
  calendarHeading,
  calendarRange,
  deliveryTone,
  deliveryTones,
  fullCalendarDate,
} from "../utils/reservation-calendar";
import { secondaryButton } from "../utils/commerce-format";
interface Props {
  anchor: string;
  view: CalendarView;
  today: string;
  selected: string;
  days: CalendarData["days"];
  loading: boolean;
  error: boolean;
  onSelect: (date: string) => void;
  onNavigate: (direction: number) => void;
  onToday: () => void;
  onView: (view: CalendarView) => void;
  onRetry: () => void;
}
export function ReservationCalendar({
  anchor,
  view,
  today,
  selected,
  days,
  loading,
  error,
  onSelect,
  onNavigate,
  onToday,
  onView,
  onRetry,
}: Props) {
  const range = calendarRange(anchor, view);
  const dates = calendarDates(range.from, range.to);
  const byDate = new Map(days.map((day) => [day.date, day]));
  return (
    <section
      aria-labelledby="reservation-calendar-title"
      aria-busy={loading}
      className="min-w-0 rounded-arma border border-arma-border bg-arma-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-arma-border p-4 sm:p-5">
        <h2
          id="reservation-calendar-title"
          className="font-arma-heading text-2xl first-letter:uppercase"
        >
          {calendarHeading(anchor, view)}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex">
            <button
              type="button"
              aria-label={view === "month" ? "Mes anterior" : "Semana anterior"}
              onClick={() => onNavigate(-1)}
              disabled={anchor < "1901-01-01"}
              className="flex size-11 items-center justify-center rounded-arma border border-arma-border focus-visible:outline-2 focus-visible:outline-arma-active disabled:opacity-40"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={
                view === "month" ? "Mes siguiente" : "Semana siguiente"
              }
              onClick={() => onNavigate(1)}
              disabled={anchor > "2198-12-01"}
              className="flex size-11 items-center justify-center rounded-arma border border-arma-border focus-visible:outline-2 focus-visible:outline-arma-active disabled:opacity-40"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
          <button type="button" onClick={onToday} className={secondaryButton}>
            Hoy
          </button>
          <div
            aria-label="Vista del calendario"
            className="flex rounded-arma border border-arma-border p-1"
          >
            {(
              [
                { key: "month", label: "Mes" },
                { key: "week", label: "Semana" },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={view === item.key}
                onClick={() => onView(item.key)}
                className={`min-h-9 rounded-arma px-3 text-sm focus-visible:outline-2 focus-visible:outline-arma-active ${view === item.key ? "bg-arma-active font-medium text-white" : "text-arma-muted"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="px-4 pt-3 text-xs leading-5 text-arma-muted sm:px-5">
        Selecciona un día para ver sus apartados. El calendario es informativo.
      </p>
      {error ? (
        <div
          role="alert"
          className="m-4 rounded-arma bg-arma-red-soft p-4 text-sm text-arma-red"
        >
          <p>No pudimos cargar las cantidades del calendario.</p>
          <button
            type="button"
            onClick={onRetry}
            className={`${secondaryButton} mt-3`}
          >
            Reintentar calendario
          </button>
        </div>
      ) : null}
      <div className="p-2 sm:p-4">
        <table
          aria-label={`Calendario de apartados, ${calendarHeading(anchor, view)}`}
          className="w-full table-fixed border-collapse"
        >
          <thead>
            <tr>
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
                <th
                  key={day}
                  scope="col"
                  className="border border-arma-border py-2 text-xs font-medium text-arma-muted"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: dates.length / 7 }, (_, week) => (
              <tr key={week}>
                {dates.slice(week * 7, week * 7 + 7).map((date) => {
                  const day = byDate.get(date);
                  const tone =
                    deliveryTones[
                      deliveryTone(date, today, (day?.pending_orders ?? 0) > 0)
                    ];
                  const outside =
                    view === "month" && date.slice(0, 7) !== anchor.slice(0, 7);
                  return (
                    <td
                      key={date}
                      className="border border-arma-border p-0 align-top"
                    >
                      <button
                        type="button"
                        aria-pressed={selected === date}
                        aria-current={date === today ? "date" : undefined}
                        aria-label={`${fullCalendarDate(date)}: ${day?.orders ?? 0} apartados, ${day?.pieces ?? 0} piezas`}
                        onClick={() => onSelect(date)}
                        className={`flex min-h-20 w-full flex-col gap-2 p-1.5 text-left focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-arma-active sm:min-h-24 sm:p-2 ${selected === date ? "bg-arma-primary-soft ring-1 ring-arma-active ring-inset" : outside ? "bg-arma-background/40" : "bg-arma-surface hover:bg-arma-background/50"}`}
                      >
                        <span
                          className={`text-xs tabular-nums sm:text-sm ${date === today ? "font-bold text-arma-active underline decoration-2 underline-offset-4" : outside ? "text-arma-muted" : "text-arma-text"}`}
                        >
                          {Number(date.slice(8))}
                        </span>
                        {day && !error ? (
                          <span
                            className={`block w-full rounded-arma p-1 text-[11px] leading-4 tabular-nums sm:p-1.5 ${tone.classes}`}
                          >
                            <span className="font-semibold">
                              {day.orders}
                              <span className="hidden md:inline">
                                {" "}
                                {day.orders === 1 ? "apartado" : "apartados"}
                              </span>
                            </span>
                            <span className="block max-sm:hidden">
                              {day.pieces}{" "}
                              {day.pieces === 1 ? "pieza" : "piezas"}
                            </span>
                          </span>
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-arma-border px-4 py-4 text-[11px] text-arma-muted sm:px-5">
        {Object.entries(deliveryTones).map(([key, tone]) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span
              className={`size-2 shrink-0 rounded-full ${tone.dot}`}
              aria-hidden="true"
            />
            {tone.label}
          </span>
        ))}
      </div>
    </section>
  );
}
