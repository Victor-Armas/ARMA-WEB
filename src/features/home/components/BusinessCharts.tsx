import {
  Banknote,
  CreditCard,
  Landmark,
  ChartNoAxesCombined,
  Wallet,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import type { Dashboard } from "../schemas/dashboard.schema";
import {
  paymentLabels,
  formatMoney,
} from "@/features/commerce/utils/commerce-format";
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
);
export default function BusinessCharts({ data }: { data: Dashboard }) {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: reduced ? (false as const) : { duration: 250 },
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          boxWidth: 10,
          color: "#48433F",
          usePointStyle: true,
          pointStyle: "rect",
          padding: 18,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: {
            dataset: { label?: string };
            parsed: { y?: number | null };
          }) =>
            `${context.dataset.label ?? ""}: ${formatMoney(context.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxTicksLimit: 8, color: "#56514A" },
      },
      y: {
        beginAtZero: true,
        grid: { color: "#EEEAE5" },
        ticks: {
          color: "#56514A",
          callback: (value: string | number) => formatMoney(Number(value)),
        },
      },
    },
  };
  const payments = ["cash", "transfer", "card"].map((method) =>
    data.payments.find((p) => p.method === method),
  );
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
      <section className="min-w-0 rounded-arma border border-arma-border bg-arma-surface p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-arma-heading text-2xl">
            Ventas y cobros por día
          </h2>
          <ChartNoAxesCombined
            size={22}
            strokeWidth={1.6}
            className="shrink-0 text-arma-green"
            aria-hidden="true"
          />
        </div>
        <p className="mt-2 text-xs leading-5 text-arma-muted">
          Ventas al registrarlas. Cobros netos en la fecha en que entra o se
          devuelve el dinero.
        </p>
        <div className="relative mt-5 h-64 w-full sm:h-80 xl:h-96">
          <Line
            role="img"
            aria-label="Gráfica de ventas y cobros netos por día. Consulta las cifras en la tabla de datos."
            options={options}
            data={{
              labels: data.series.map((d) =>
                d.date.slice(5).split("-").reverse().join("/"),
              ),
              datasets: [
                {
                  label: "Ventas",
                  data: data.series.map((d) => d.sales),
                  borderColor: "#386348",
                  backgroundColor: "#386348",
                  borderWidth: 2.5,
                  pointRadius: data.series.length > 60 ? 0 : 2,
                  tension: 0.15,
                },
                {
                  label: "Cobros netos",
                  data: data.series.map((d) => d.receipts),
                  borderColor: "#315B78",
                  backgroundColor: "#315B78",
                  borderWidth: 2.5,
                  pointRadius: data.series.length > 60 ? 0 : 2,
                  tension: 0.15,
                },
              ],
            }}
          />
        </div>
        <details className="mt-3">
          <summary className="min-h-11 cursor-pointer py-3 text-sm text-arma-active">
            Ver datos diarios
          </summary>
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-left text-xs tabular-nums">
              <caption className="sr-only">
                Ventas y cobros diarios en MXN
              </caption>
              <thead>
                <tr>
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Ventas</th>
                  <th className="py-2">Cobros netos</th>
                </tr>
              </thead>
              <tbody>
                {data.series.map((d) => (
                  <tr key={d.date} className="border-t border-arma-border">
                    <td className="py-2">{d.date}</td>
                    <td>{formatMoney(d.sales)}</td>
                    <td>{formatMoney(d.receipts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <section className="min-w-0 rounded-arma border border-arma-border bg-arma-surface p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-arma-heading text-2xl">
            Cómo pagan los clientes
          </h2>
          <Wallet
            size={22}
            strokeWidth={1.6}
            className="shrink-0 text-arma-info"
            aria-hidden="true"
          />
        </div>
        <p className="mt-2 text-xs leading-5 text-arma-muted">
          Cobros a clientes del taller y de vendedores; no son las liquidaciones
          a ARMA.
        </p>
        <div className="relative mt-4 h-48 w-full sm:h-52">
          <Bar
            role="img"
            aria-label="Cobros y reembolsos por efectivo, transferencia y tarjeta. Las cifras se muestran debajo."
            options={options}
            data={{
              labels: [
                paymentLabels.cash,
                paymentLabels.transfer,
                paymentLabels.card,
              ],
              datasets: [
                {
                  label: "Recibido",
                  data: payments.map((p) => p?.received ?? 0),
                  backgroundColor: ["#386348", "#315B78", "#89632E"],
                  borderRadius: 2,
                },
                {
                  label: "Reembolsado",
                  data: payments.map((p) => p?.refunded ?? 0),
                  backgroundColor: "#A1443E",
                  borderRadius: 2,
                },
              ],
            }}
          />
        </div>
        <dl className="mt-4 divide-y divide-arma-border border-t border-arma-border">
          {(["cash", "transfer", "card"] as const).map((method) => {
            const payment = data.payments.find((row) => row.method === method);
            const Icon =
              method === "cash"
                ? Banknote
                : method === "transfer"
                  ? Landmark
                  : CreditCard;
            const color =
              method === "cash"
                ? "text-arma-green"
                : method === "transfer"
                  ? "text-arma-info"
                  : "text-arma-gold";
            return (
              <div key={method} className="flex items-start gap-3 py-3">
                <Icon
                  size={19}
                  strokeWidth={1.6}
                  aria-hidden="true"
                  className={`mt-0.5 shrink-0 ${color}`}
                />
                <div className="min-w-0 flex-1">
                  <dt className="text-sm font-medium">
                    {paymentLabels[method]}
                  </dt>
                  <dd className="mt-1 break-words text-xs leading-5 text-arma-muted">
                    {formatMoney(payment?.received ?? 0)} recibidos ·{" "}
                    {formatMoney(payment?.refunded ?? 0)} reembolsados
                  </dd>
                </div>
                <dd
                  className={`shrink-0 text-right text-sm font-semibold tabular-nums ${(payment?.net ?? 0) < 0 ? "text-arma-red" : color}`}
                >
                  {formatMoney(payment?.net ?? 0)}
                  <span className="mt-1 block text-xs font-normal text-arma-muted">
                    netos
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>
      </section>
    </div>
  );
}
