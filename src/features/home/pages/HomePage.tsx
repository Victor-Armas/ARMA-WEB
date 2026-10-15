import { CompanyFinances } from "../components/CompanyFinances";
import { SellerHomeAccount } from "@/features/sellers/components/SellerHomeAccount";
import { lazy, Suspense, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { useCurrentProfile } from "@/features/profile/hooks/useCurrentProfile";
import { useAppAccess } from "@/features/access/hooks/useAppAccess";
import {
  primaryButton,
  secondaryButton,
  todayInMonterrey,
} from "@/features/commerce/utils/commerce-format";
import { addDays } from "@/features/commerce/utils/reservation-calendar";
import { useDashboard } from "../hooks/useDashboard";
import { PriceAnalysis } from "../components/PriceAnalysis";
import { DashboardOverview } from "../components/DashboardOverview";
import { DashboardFinances } from "../components/DashboardFinances";
import { DashboardActivity } from "../components/DashboardActivity";
import { DashboardPeriodFilter } from "../components/DashboardPeriodFilter";
const BusinessCharts = lazy(() => import("../components/BusinessCharts"));
export function HomePage() {
  const { fullName } = useCurrentProfile();
  const access = useAppAccess();
  const today = todayInMonterrey();
  const [range, setRange] = useState({
    from: today.slice(0, 7) + "-01",
    to: today,
  });
  const [draft, setDraft] = useState(range);
  const [rangeError, setRangeError] = useState("");
  const query = useDashboard(range.from, range.to);
  const data = query.data;
  function apply() {
    if (
      !draft.from ||
      !draft.to ||
      draft.from > draft.to ||
      Math.round((Date.parse(draft.to) - Date.parse(draft.from)) / 86400000) >
        366
    ) {
      setRangeError("Elige un período válido de hasta un año.");
      return;
    }
    setRangeError("");
    setRange(draft);
  }
  function preset(kind: "month" | "last30") {
    const next = {
      from: kind === "month" ? today.slice(0, 7) + "-01" : addDays(today, -29),
      to: today,
    };
    setDraft(next);
    setRange(next);
    setRangeError("");
  }
  return (
    <section className="mx-auto max-w-[1680px] px-5 py-6 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words font-arma-heading text-4xl tracking-[-0.035em]">
            {fullName ? `Hola, ${fullName}` : "Hola"}
          </h1>
          <p className="mt-2 text-sm text-arma-neutral">
            {data?.scope ?? "Tu actividad"} · Cifras en pesos mexicanos
          </p>
        </div>
        {access.can("products.read") ? (
          <Link
            to="/products"
            className={`${primaryButton} inline-flex items-center gap-3`}
          >
            Consultar productos
            <ArrowUpRight size={18} strokeWidth={1.7} aria-hidden="true" />
          </Link>
        ) : null}
      </header>
      {access.can("consignments.read") &&
      !access.can("inventory.sell_workshop") ? (
        <SellerHomeAccount />
      ) : null}
      <DashboardPeriodFilter
        draft={draft}
        range={range}
        today={today}
        busy={query.isFetching}
        error={rangeError}
        onDraftChange={setDraft}
        onApply={apply}
        onPreset={preset}
      />
      {query.isPending ? (
        <div
          role="status"
          className="mt-6 rounded-arma border border-arma-border bg-arma-surface px-5 py-12 text-sm text-arma-muted"
        >
          Consultando la actividad de tu negocio…
        </div>
      ) : query.isError || !data ? (
        <div
          role="alert"
          className="mt-6 rounded-arma border border-arma-border bg-arma-surface p-6"
        >
          <p>No pudimos cargar el resumen del negocio.</p>
          <button
            className={`${secondaryButton} mt-3`}
            onClick={() => void query.refetch()}
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div aria-busy={query.isFetching}>
          {access.can("consignments.manage") ? (
            <p className="mt-5 text-xs leading-5 text-arma-muted">
              Los cobros de esta sección son pagos de clientes al taller y a
              vendedores. Las liquidaciones que recibes de vendedores se
              consultan por separado en{" "}
              <Link
                to="/sellers"
                className="font-medium text-arma-active underline underline-offset-4"
              >
                Vendedores
              </Link>
              .
            </p>
          ) : null}
          {data.company ? <CompanyFinances data={data.company} /> : null}
          <h2 className="mt-8 font-arma-heading text-2xl">
            {data.company
              ? "Actividad comercial · Taller y vendedores"
              : "Mi actividad comercial"}
          </h2>
          <DashboardOverview data={data} />
          <div className="mt-6">
            <Suspense
              fallback={
                <p
                  role="status"
                  className="rounded-arma border border-arma-border bg-arma-surface p-6 text-sm text-arma-muted"
                >
                  Preparando gráficas…
                </p>
              }
            >
              <BusinessCharts data={data} />
            </Suspense>
          </div>
          {data.finance ? (
            <>
              <DashboardFinances data={data} />
              <PriceAnalysis prices={data.prices} />
            </>
          ) : null}
          <DashboardActivity data={data} />
        </div>
      )}
    </section>
  );
}
