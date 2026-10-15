import { Link } from "react-router";
export function DataPrivacyNotice({
  audience = "customer",
}: {
  audience?: "customer" | "staff";
}) {
  return (
    <p className="rounded-arma border-l-2 border-arma-info bg-arma-info-soft p-3 text-xs leading-5 text-arma-info">
      {audience === "staff"
        ? "Informa a la persona antes de crear su cuenta. Sus datos se usarán para gestionar el acceso y su actividad en ARMA."
        : "Antes de registrar datos, comparte el aviso con el cliente. Nombre y teléfono se utilizan para atender esta operación; no escribas datos bancarios ni información sensible en notas."}{" "}
      <Link
        to="/legal/privacidad"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium underline underline-offset-4"
      >
        Consultar aviso de privacidad (nueva pestaña)
      </Link>
      .
    </p>
  );
}
