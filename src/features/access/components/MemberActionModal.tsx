import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  primaryButton,
  secondaryButton,
} from "@/features/commerce/utils/commerce-format";
import type { TeamMember } from "../schemas/access.schema";
export type MemberAction = "reset" | "disable" | "enable";
const labels = {
  reset: "Restablecer contraseña",
  disable: "Deshabilitar cuenta",
  enable: "Reactivar cuenta",
};
export function MemberActionModal({
  action,
  member,
  onConfirm,
  onClose,
}: {
  action: MemberAction;
  member: TeamMember;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
    } catch (failure: unknown) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No pudimos completar la operación.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={labels[action]} onClose={onClose} busy={busy}>
      <p className="text-sm font-semibold">
        {member.full_name || member.email}
      </p>
      <p className="mt-3 text-sm leading-6 text-arma-muted">
        {action === "reset"
          ? "Se cerrará su acceso actual y verás una nueva contraseña temporal válida por 24 horas. Tendrá que cambiarla para volver a entrar."
          : action === "disable"
            ? "Esta persona perderá acceso a ARMA. Sus ventas, apartados e historial se conservarán."
            : "Esta persona podrá volver a iniciar sesión. Si su contraseña temporal venció, genera una nueva con Restablecer contraseña."}
      </p>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-arma-red">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void confirm()}
          className={primaryButton}
        >
          {busy ? "Procesando…" : labels[action]}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className={secondaryButton}
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
}
