import { TrendingUp, TriangleAlert } from "lucide-react";
import type { Dashboard } from "../schemas/dashboard.schema";
import { formatMoney } from "@/features/commerce/utils/commerce-format";
function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
  }).format(new Date(value + "T12:00:00"));
}
export function PersonalProgress({ data }: { data: Dashboard }) {
  const personal = data.personal;
  if (!personal) return null;
  const previous = personal.previous;
  const salesChange = data.sale_count - previous.sale_count;
  const comparable =
    personal.profit !== null &&
    previous.profit !== null &&
    personal.unknown_pieces === 0 &&
    previous.unknown_pieces === 0;
  const profitChange = comparable
    ? (personal.profit ?? 0) - (previous.profit ?? 0)
    : null;
  return (
    <section
      aria-labelledby="personal-progress-title"
      className="mt-5 rounded-arma border border-arma-green/20 bg-arma-green-soft p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2
          id="personal-progress-title"
          className="flex items-center gap-2 text-sm font-semibold text-arma-green"
        >
          <TrendingUp size={18} aria-hidden="true" />
          Cómo van tus ventas
        </h2>
        <p className="text-xs leading-5 text-arma-green">
          Comparado con {dateLabel(previous.from)} – {dateLabel(previous.to)}
        </p>
      </div>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <div>
          <p
            className={`text-xl font-semibold tabular-nums ${salesChange < 0 ? "text-arma-red" : "text-arma-green"}`}
          >
            {salesChange > 0 ? "+" : ""}
            {salesChange} ventas
          </p>
          <p className="mt-1 text-xs leading-5 text-arma-green">
            Antes {previous.sale_count} · Ahora {data.sale_count}. Períodos de
            la misma duración.
          </p>
        </div>
        <div>
          <p
            className={`text-xl font-semibold tabular-nums ${profitChange !== null && profitChange < 0 ? "text-arma-red" : "text-arma-green"}`}
          >
            {profitChange === null
              ? "Ganancia por completar"
              : `${profitChange > 0 ? "+" : ""}${formatMoney(profitChange)}`}
          </p>
          <p className="mt-1 text-xs leading-5 text-arma-green">
            {profitChange === null
              ? "Faltan acuerdos históricos o permisos para comparar ganancias completas."
              : "Diferencia en tu ganancia frente al período anterior."}
          </p>
        </div>
      </div>
      {personal.unknown_pieces > 0 ? (
        <p className="mt-4 flex items-start gap-2 rounded-arma bg-arma-warning-soft p-3 text-xs leading-5 text-arma-warning">
          <TriangleAlert
            size={17}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          Hay movimientos de {personal.unknown_pieces} piezas sin importe
          histórico acordado con ARMA. Mostramos solo la ganancia conocida, sin
          inventar costos.
        </p>
      ) : null}
    </section>
  );
}
