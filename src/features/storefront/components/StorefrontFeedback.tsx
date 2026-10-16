import { ArrowUpRight, RefreshCw, Search } from "lucide-react";
import { Link } from "react-router";
export function StorefrontFeedback({
  loading = false,
  error = false,
  onRetry,
}: {
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  if (loading)
    return (
      <div
        role="status"
        aria-label="Cargando catálogo"
        className="grid gap-6 py-12 sm:grid-cols-2 lg:grid-cols-4"
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="aspect-[4/5] rounded-arma bg-arma-primary-soft"
          />
        ))}
        <span className="sr-only">Cargando catálogo…</span>
      </div>
    );
  return (
    <div
      role={error ? "alert" : "status"}
      className="flex min-h-80 flex-col items-center justify-center px-5 py-14 text-center"
    >
      {error ? (
        <RefreshCw size={30} strokeWidth={1.5} aria-hidden="true" />
      ) : (
        <Search size={30} strokeWidth={1.5} aria-hidden="true" />
      )}
      <h2 className="mt-5 font-arma-heading text-3xl">
        {error ? "El catálogo no pudo cargar" : "Todavía no hay modelos aquí"}
      </h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-arma-neutral">
        {error
          ? "Revisa tu conexión y vuelve a intentarlo."
          : "Prueba otra búsqueda o vuelve pronto para descubrir la colección."}
      </p>
      {error ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 min-h-11 rounded-arma bg-arma-text px-5 text-sm text-white"
        >
          Volver a intentar
        </button>
      ) : (
        <Link
          to="/coleccion/catalogo"
          className="mt-6 inline-flex min-h-11 items-center gap-3 text-sm underline underline-offset-4"
        >
          Ver todo el catálogo
          <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
