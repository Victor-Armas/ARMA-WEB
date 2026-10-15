import type { ColorStock, StockLevel } from "../types/product-stock.types";
import { getStockLevel } from "../utils/product-stock";

interface ProductStockSummaryProps {
  stocks: ColorStock[];
}

const levels: Record<StockLevel, { classes: string; label: string }> = {
  low: { classes: "bg-arma-red-soft text-arma-red", label: "Stock bajo" },
  warning: {
    classes: "bg-arma-warning-soft text-arma-warning",
    label: "Stock limitado",
  },
  healthy: {
    classes: "bg-arma-green-soft text-arma-green",
    label: "Stock suficiente",
  },
};

export function ProductStockSummary({ stocks }: ProductStockSummaryProps) {
  if (stocks.length === 0) {
    return (
      <p className="mt-4 text-sm text-arma-muted">Sin variantes activas.</p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {stocks.map((color) => (
        <div key={color.color}>
          <h3 className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
            <span>{color.color}</span>
            {stocks.length > 1 ? (
              <span className="text-xs text-arma-muted">
                {color.quantity} disponibles
              </span>
            ) : null}
          </h3>
          <dl className="grid grid-cols-3 gap-2">
            {color.sizes.map(({ size, label, quantity }) => {
              const level = levels[getStockLevel(quantity)];
              return (
                <div
                  key={size}
                  className={`min-w-0 rounded-arma px-2 py-2 ${level.classes}`}
                >
                  <dt className="truncate text-xs">{label}</dt>
                  <dd className="mt-1 text-lg font-semibold leading-none tabular-nums">
                    {quantity}
                    <span className="sr-only">
                      {" "}
                      disponibles. {level.label}.
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      ))}
    </div>
  );
}
