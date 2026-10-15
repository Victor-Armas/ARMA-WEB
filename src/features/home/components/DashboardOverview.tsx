import {
  ArrowUpRight,
  Banknote,
  Bookmark,
  CircleDollarSign,
  CreditCard,
  Coins,
  ChartNoAxesCombined,
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
type OverviewMetricProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: keyof typeof metricTones;
};
function OverviewMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: OverviewMetricProps) {
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
  const business = data.mode === "business";
  const company = data.company;
  const personal = data.personal;
  const metrics: OverviewMetricProps[] = business
    ? [
        {
          label: "Ventas a clientes",
          value: formatMoney(data.sales),
          detail: `${data.sale_count} ventas · ${data.pieces} piezas del taller y vendedores, antes de devoluciones`,
          icon: ShoppingBag,
          tone: "green",
        },
        ...(company
          ? [
              {
                label: "Margen de ARMA",
                value: formatMoney(company.known_margin),
                detail: `${company.unknown_cost_pieces > 0 ? "Cálculo parcial. " : ""}Venta propia menos costo registrado. Antes de impuestos y gastos no registrados.`,
                icon: Coins,
                tone: "paper",
              } satisfies OverviewMetricProps,
            ]
          : [
              {
                label: "Ventas realizadas",
                value: String(data.sale_count),
                detail: `${data.pieces} piezas registradas en el período`,
                icon: ChartNoAxesCombined,
                tone: "paper",
              } satisfies OverviewMetricProps,
            ]),
        {
          label: company ? "Cobros netos de ARMA" : "Cobros netos de clientes",
          value: formatMoney(company?.net_receipts ?? data.net_receipts),
          detail: company
            ? `Taller y liquidaciones de vendedores. ${formatMoney(company.refunded)} reembolsados.`
            : `${formatMoney(data.refunds)} reembolsados · No es utilidad`,
          icon: Banknote,
          tone: "blue",
        },
        {
          label: "Apartados por cobrar",
          value: formatMoney(data.balance),
          detail: `${data.pending_reservations} por entregar · Saldo actual con clientes de toda la red`,
          icon: Bookmark,
          tone: "gold",
        },
      ]
    : [
        {
          label: personal?.unknown_pieces
            ? "Ganancia conocida"
            : "Ganancia de tus ventas",
          value: personal?.profit == null ? "—" : formatMoney(personal.profit),
          detail:
            "Tus ventas menos devoluciones e importe acordado con ARMA. Antes de gastos personales e impuestos.",
          icon: Coins,
          tone: "green",
        },
        {
          label: "Ventas realizadas",
          value: String(data.sale_count),
          detail: `${formatMoney(data.sales)} vendidos · ${data.pieces} piezas antes de devoluciones`,
          icon: ShoppingBag,
          tone: "paper",
        },
        {
          label: "Cobros netos de clientes",
          value: formatMoney(data.net_receipts),
          detail: `${formatMoney(data.receipts)} recibidos · ${formatMoney(data.refunds)} reembolsados. Incluye pagos de apartados.`,
          icon: CreditCard,
          tone: "blue",
        },
        {
          label: "Apartados por cobrar",
          value: formatMoney(data.balance),
          detail: `${data.pending_reservations} por entregar · Saldo actual de tus clientes`,
          icon: Bookmark,
          tone: "gold",
        },
      ];
  const stats = [
    {
      label: business
        ? "Disponibles en taller"
        : "Disponibles en tu inventario",
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
        aria-label={
          business ? "Resumen del negocio" : "Resumen de tu actividad"
        }
        className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
      >
        {metrics.map((metric) => (
          <OverviewMetric key={metric.label} {...metric} />
        ))}
      </section>
      <section
        aria-label={
          business ? "Estado del negocio" : "Tu inventario y entregas"
        }
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
