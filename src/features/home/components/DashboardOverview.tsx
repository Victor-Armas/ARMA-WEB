import {
  ArrowUpRight,
  Banknote,
  Bookmark,
  CircleDollarSign,
  CreditCard,
  Hammer,
  RotateCcw,
  Shirt,
  ShoppingBag,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router";
import { useAppAccess } from "@/features/access/hooks/useAppAccess";
import { formatMoney } from "@/features/commerce/utils/commerce-format";
import type { Dashboard } from "../schemas/dashboard.schema";
const metricTones = {
  green: "bg-arma-green text-white",
  paper: "border border-arma-border bg-arma-surface text-arma-text",
  blue: "bg-arma-info text-white",
  gold: "bg-arma-warning-soft text-arma-warning",
};
function OverviewMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: keyof typeof metricTones;
}) {
  const dark = tone === "green" || tone === "blue";
  return (
    <div
      className={`flex min-w-0 flex-col rounded-arma p-4 sm:p-5 ${metricTones[tone]}`}
    >
      <div className="flex min-h-10 items-start justify-between gap-3 sm:min-h-5">
        <p className={`text-sm font-medium ${dark ? "text-white/90" : ""}`}>
          {label}
        </p>
        <Icon
          size={21}
          strokeWidth={1.6}
          aria-hidden="true"
          className="mt-0.5 shrink-0"
        />
      </div>
      <p className="mt-4 break-words text-xl font-semibold tracking-tight tabular-nums sm:text-2xl 2xl:text-3xl">
        {value}
      </p>
      <p
        className={`mt-3 border-t pt-3 text-xs leading-5 ${dark ? "border-white/20 text-white/90" : tone === "gold" ? "border-arma-warning/20 text-arma-warning" : "border-arma-border text-arma-muted"}`}
      >
        {detail}
      </p>
    </div>
  );
}
export function DashboardOverview({ data }: { data: Dashboard }) {
  const access = useAppAccess();
  const stats = [
    {
      label: "Piezas disponibles",
      value: data.available ?? "—",
      icon: Shirt,
      to: access.can("products.read") ? "/products" : null,
      urgent: false,
    },
    {
      label: "Precio medio de venta",
      value: formatMoney(data.average_price),
      icon: CircleDollarSign,
      to: access.can("sales.read") ? "/sales" : null,
      urgent: false,
    },
    {
      label: "Piezas devueltas",
      value: data.returned_pieces,
      icon: RotateCcw,
      to: access.can("sales.read") ? "/sales" : null,
      urgent: false,
    },
    {
      label: "Entregas atrasadas",
      value: data.overdue,
      icon: TriangleAlert,
      to: access.can("reservations.read") ? "/reservations" : null,
      urgent: data.overdue > 0,
    },
    ...(data.production_pending === null
      ? []
      : [
          {
            label: "Armados en proceso",
            value: data.production_pending,
            icon: Hammer,
            to: access.can("production.read") ? "/production" : null,
            urgent: false,
          },
        ]),
  ];
  return (
    <>
      <section
        aria-label="Resumen del negocio"
        className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
      >
        <OverviewMetric
          label="Ventas registradas"
          value={formatMoney(data.sales)}
          detail={`${data.sale_count} ventas · ${data.pieces} piezas antes de devoluciones`}
          icon={ShoppingBag}
          tone="green"
        />
        <OverviewMetric
          label="Cobros de clientes"
          value={formatMoney(data.receipts)}
          detail="Pagos iniciales, abonos y saldos cobrados en el período"
          icon={Banknote}
          tone="paper"
        />
        <OverviewMetric
          label="Cobros netos de clientes"
          value={formatMoney(data.net_receipts)}
          detail={`${formatMoney(data.refunds)} reembolsados · No es utilidad`}
          icon={CreditCard}
          tone="blue"
        />
        <OverviewMetric
          label="Saldo por cobrar"
          value={formatMoney(data.balance)}
          detail={`${data.pending_reservations} apartados por entregar · Saldo actual de todos los períodos`}
          icon={Bookmark}
          tone="gold"
        />
      </section>
      <section
        aria-label="Estado del taller"
        className="mt-4 grid grid-cols-2 gap-x-5 rounded-arma border border-arma-border bg-arma-surface px-4 sm:px-5 md:grid-cols-3 lg:flex lg:divide-x lg:divide-arma-border lg:gap-0"
      >
        {stats.map(({ label, value, icon: Icon, to, urgent }) => {
          const content = (
            <>
              <div className="flex items-center gap-2">
                <Icon
                  size={17}
                  strokeWidth={1.7}
                  aria-hidden="true"
                  className={urgent ? "text-arma-red" : "text-arma-icon"}
                />
                <span
                  className={`min-w-0 break-words text-lg font-semibold tabular-nums ${urgent ? "text-arma-red" : ""}`}
                >
                  {value}
                </span>
                {to ? (
                  <ArrowUpRight
                    size={14}
                    aria-hidden="true"
                    className="ml-auto shrink-0 text-arma-muted"
                  />
                ) : null}
              </div>
              <p className="mt-1.5 text-xs text-arma-muted">{label}</p>
            </>
          );
          const style =
            "min-w-0 border-b border-arma-border py-4 last:border-b-0 lg:flex-1 lg:border-b-0 lg:px-4 lg:first:pl-0 lg:last:pr-0";
          return to ? (
            <Link
              key={label}
              to={to}
              className={`${style} no-underline hover:text-arma-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active`}
            >
              {content}
            </Link>
          ) : (
            <div key={label} className={style}>
              {content}
            </div>
          );
        })}
      </section>
    </>
  );
}
