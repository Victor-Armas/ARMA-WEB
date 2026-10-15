import { CalendarDays } from "lucide-react";
import {
  fieldClass,
  primaryButton,
  secondaryButton,
} from "@/features/commerce/utils/commerce-format";
export interface DashboardPeriod {
  from: string;
  to: string;
}
export function DashboardPeriodFilter({
  draft,
  range,
  today,
  busy,
  error,
  onDraftChange,
  onApply,
  onPreset,
}: {
  draft: DashboardPeriod;
  range: DashboardPeriod;
  today: string;
  busy: boolean;
  error: string;
  onDraftChange: (value: DashboardPeriod) => void;
  onApply: () => void;
  onPreset: (kind: "month" | "last30") => void;
}) {
  const month = range.from === today.slice(0, 7) + "-01" && range.to === today;
  return (
    <div className="mt-6 rounded-arma border border-arma-border bg-arma-surface p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onApply();
        }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-end">
          <CalendarDays
            size={20}
            strokeWidth={1.6}
            aria-hidden="true"
            className="mb-3 hidden text-arma-active lg:block"
          />
          <div className="min-w-0 sm:w-44">
            <label
              htmlFor="home-from"
              className="mb-2 block text-xs font-medium"
            >
              Desde
            </label>
            <input
              id="home-from"
              type="date"
              value={draft.from}
              onChange={(e) =>
                onDraftChange({ ...draft, from: e.target.value })
              }
              className={`${fieldClass} min-w-0`}
            />
          </div>
          <div className="min-w-0 sm:w-44">
            <label htmlFor="home-to" className="mb-2 block text-xs font-medium">
              Hasta
            </label>
            <input
              id="home-to"
              type="date"
              value={draft.to}
              onChange={(e) => onDraftChange({ ...draft, to: e.target.value })}
              className={`${fieldClass} min-w-0`}
            />
          </div>
          <button
            type="submit"
            className={`${primaryButton} col-span-2 min-h-11`}
            disabled={busy}
          >
            Consultar
          </button>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <button
            type="button"
            aria-pressed={month}
            className={`${secondaryButton} flex-1 sm:flex-none ${month ? "border-arma-primary bg-arma-primary-soft text-arma-active" : ""}`}
            onClick={() => onPreset("month")}
          >
            Este mes
          </button>
          <button
            type="button"
            className={`${secondaryButton} flex-1 sm:flex-none`}
            onClick={() => onPreset("last30")}
          >
            Últimos 30 días
          </button>
        </div>
      </form>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-arma-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
