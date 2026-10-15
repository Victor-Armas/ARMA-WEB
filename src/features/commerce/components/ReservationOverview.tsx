import type { ReservationCalendar } from "../schemas/reservation-calendar.schema";
import { formatMoney } from "../utils/commerce-format";
export function ReservationOverview({
  summary,
  loading,
}: {
  summary: ReservationCalendar["summary"] | undefined;
  loading: boolean;
}) {
  const values = [
    { label: "Apartados por entregar", value: summary?.pending_orders },
    { label: "Piezas por entregar", value: summary?.pending_pieces },
    {
      label: "Saldo pendiente",
      value: summary ? formatMoney(summary.balance) : undefined,
    },
    { label: "Entregas atrasadas", value: summary?.overdue_orders },
  ];
  return (
    <div>
      <dl
        aria-busy={loading}
        className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        {values.map((item) => (
          <div
            key={item.label}
            className="min-w-0 rounded-arma border border-arma-border bg-arma-surface p-4 sm:p-5"
          >
            <dt className="text-xs text-arma-muted sm:text-sm">{item.label}</dt>
            <dd
              className={`mt-2 text-2xl font-semibold tabular-nums sm:text-3xl ${item.label === "Entregas atrasadas" && summary?.overdue_orders ? "text-arma-red" : "text-arma-text"}`}
            >
              {item.value ?? "—"}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-arma-muted">
        Totales de los apartados que coinciden con tus filtros, en todas las
        fechas.
      </p>
    </div>
  );
}
