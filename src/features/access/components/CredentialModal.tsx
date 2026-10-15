import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  fieldClass,
  primaryButton,
  secondaryButton,
} from "@/features/commerce/utils/commerce-format";
import type { TemporaryCredential } from "../schemas/access.schema";
export function CredentialModal({
  credential,
  onClose,
}: {
  credential: TemporaryCredential;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(credential.temporary_password);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  }
  return (
    <Modal title="Contraseña temporal" onClose={onClose}>
      <p className="break-all text-sm font-semibold">{credential.email}</p>
      <p className="mt-3 text-sm leading-6 text-arma-muted">
        Compártela de forma privada con esta persona. Tendrá que ingresar esta
        contraseña y crear una nueva antes de entrar a ARMA.
      </p>
      <label
        htmlFor="temporary-credential"
        className="mt-5 mb-2 block text-sm font-medium"
      >
        Contraseña de acceso
      </label>
      <input
        id="temporary-credential"
        type="text"
        readOnly
        autoComplete="off"
        value={credential.temporary_password}
        className={`${fieldClass} font-mono text-sm`}
        onFocus={(event) => event.target.select()}
      />
      <button
        type="button"
        onClick={() => void copy()}
        className={`${secondaryButton} mt-3`}
      >
        {copied ? "Copiada" : "Copiar contraseña"}
      </button>
      {copyError ? (
        <p role="alert" className="mt-2 text-sm text-arma-red">
          Selecciona la contraseña y cópiala manualmente.
        </p>
      ) : null}
      <p className="mt-5 rounded-arma bg-arma-warning-soft p-3 text-sm text-arma-warning">
        Vence el{" "}
        {new Intl.DateTimeFormat("es-MX", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(credential.expires_at))}
        . Después necesitará otro restablecimiento.
      </p>
      <p className="mt-3 text-xs leading-5 text-arma-muted">
        Esta contraseña se muestra una sola vez. Al cerrar, tendrás que generar
        otra si la pierdes.
      </p>
      <button
        type="button"
        onClick={onClose}
        className={`${primaryButton} mt-5`}
      >
        Listo, cerrar
      </button>
    </Modal>
  );
}
