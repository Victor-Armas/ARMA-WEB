import { useSellerOverview } from "../hooks/useSellerOverview";
import { SellerSummary } from "./SellerSummary";
import { secondaryButton } from "@/features/commerce/utils/commerce-format";
export function SellerHomeAccount() {
  const query = useSellerOverview();
  return (
    <section className="mt-6">
      <h2 className="font-arma-heading text-2xl">Tu cuenta con ARMA</h2>
      <p className="mt-2 text-sm text-arma-muted">
        Saldo acumulado de mercancía asignada, independiente del período de
        ventas seleccionado.
      </p>
      {query.isPending ? (
        <p role="status" className="mt-4 text-sm">
          Consultando entregas y saldo…
        </p>
      ) : query.isError ? (
        <div role="alert" className="mt-4">
          <p>No pudimos consultar tu saldo.</p>
          <button
            type="button"
            className={`${secondaryButton} mt-3`}
            onClick={() => void query.refetch()}
          >
            Reintentar saldo
          </button>
        </div>
      ) : query.data ? (
        <SellerSummary summary={query.data.summary} compact />
      ) : null}
    </section>
  );
}
