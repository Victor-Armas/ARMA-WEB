import { useCallback, useState } from "react";
import { useAppAccess } from "@/features/access/hooks/useAppAccess";
import { secondaryButton } from "@/features/commerce/utils/commerce-format";
import { ReceiptForm } from "./ReceiptForm";
import { MaterialEntriesHistory } from "./MaterialEntriesHistory";
export function MaterialEntriesContent({
  onBusyChange,
}: {
  onBusyChange?: (busy: boolean) => void;
}) {
  const access = useAppAccess();
  const canReceive = access.can("materials.receive");
  const [view, setView] = useState(canReceive ? "receive" : "history");
  const [busy, setBusy] = useState(false);
  const handleBusyChange = useCallback(
    (value: boolean) => {
      setBusy(value);
      onBusyChange?.(value);
    },
    [onBusyChange],
  );
  return (
    <>
      <div
        className="mb-5 flex flex-wrap gap-2"
        aria-label="Opciones de entradas de materia prima"
      >
        {canReceive ? (
          <>
            <button
              type="button"
              disabled={busy}
              aria-pressed={view === "receive"}
              onClick={() => setView("receive")}
              className={`${secondaryButton} ${view === "receive" ? "font-semibold text-arma-active" : ""}`}
            >
              Registrar entrada
            </button>
            <button
              type="button"
              disabled={busy}
              aria-pressed={view === "value"}
              onClick={() => setView("value")}
              className={`${secondaryButton} ${view === "value" ? "font-semibold text-arma-active" : ""}`}
            >
              Ajustar costo actual
            </button>
          </>
        ) : null}
        <button
          type="button"
          disabled={busy}
          aria-pressed={view === "history"}
          onClick={() => setView("history")}
          className={`${secondaryButton} ${view === "history" ? "font-semibold text-arma-active" : ""}`}
        >
          Historial de entradas
        </button>
      </div>
      {view === "history" ? (
        <MaterialEntriesHistory />
      ) : canReceive ? (
        <>
          <p className="mb-5 text-sm leading-6 text-arma-muted">
            {view === "receive"
              ? "Agrega piezas a un insumo que ya existe. Selecciona su variante, la cantidad recibida y el costo de esta compra. Para registrar un insumo nuevo, utiliza Crear insumo."
              : "Corrige el costo por pieza de las existencias actuales. Este ajuste no agrega ni retira piezas y queda registrado con su motivo."}
          </p>
          <ReceiptForm
            key={view}
            valuation={view === "value"}
            onBusyChange={handleBusyChange}
          />
        </>
      ) : null}
    </>
  );
}
