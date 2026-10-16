import type { ReactNode } from "react";
import { Link } from "react-router";
import { useAppAccess } from "../hooks/useAppAccess";

export function PermissionGate({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const access = useAppAccess();
  if (access.isPending)
    return (
      <p role="status" className="px-5 py-8 text-sm text-arma-muted">
        Verificando acceso…
      </p>
    );
  if (access.isError)
    return (
      <div role="alert" className="px-5 py-8">
        <p>No pudimos verificar tus permisos.</p>
        <button
          type="button"
          onClick={() => void access.refetch()}
          className="mt-3 min-h-11 text-arma-active underline underline-offset-4"
        >
          Reintentar
        </button>
      </div>
    );
  if (!access.can(permission))
    return (
      <section className="px-5 py-8 sm:px-8">
        <h1 className="font-arma-heading text-3xl">Acceso restringido</h1>
        <p className="mt-3 text-sm text-arma-muted">
          Tu cuenta no tiene permiso para consultar esta sección.
        </p>
        <Link
          to="/inicio"
          className="mt-4 inline-block text-arma-active underline underline-offset-4"
        >
          Volver al inicio
        </Link>
      </section>
    );
  return children;
}
