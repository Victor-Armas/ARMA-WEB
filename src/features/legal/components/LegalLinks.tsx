import { Link } from "react-router";
export function LegalLinks({
  publicCatalog = false,
}: {
  publicCatalog?: boolean;
}) {
  return (
    <nav
      aria-label="Información legal"
      className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-arma-muted"
    >
      {[
        ["privacidad", "Privacidad"],
        ["terminos", "Términos de uso"],
        ["almacenamiento", "Cookies y almacenamiento"],
        ["operaciones", "Ventas y apartados"],
      ].map(([key, label]) => (
        <Link
          key={key}
          to={`/legal/${key}${publicCatalog ? "?volver=coleccion" : ""}`}
          className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-arma-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
