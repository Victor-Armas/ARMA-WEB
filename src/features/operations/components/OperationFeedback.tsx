import { secondaryButton } from "@/features/commerce/utils/commerce-format";
export function OperationFeedback({
  uncertain,
  retry,
  busy,
}: {
  uncertain: boolean;
  retry: () => void;
  busy: boolean;
}) {
  return uncertain ? (
    <div
      role="alert"
      className="mt-4 border border-arma-border bg-arma-warning-soft p-3 text-sm"
    >
      <p>
        No pudimos confirmar la respuesta. Reintenta la misma operación para
        comprobarla sin duplicarla.
      </p>
      <button
        type="button"
        className={`${secondaryButton} mt-3`}
        disabled={busy}
        onClick={retry}
      >
        Comprobar operación
      </button>
    </div>
  ) : null;
}
